import React, { useRef } from 'react';
import { Animated, PanResponder, View, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  uri: string;
}

export default function PinchableImage({ uri }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });
  const initialDistance = useRef<number | null>(null);

  // Keep track of values without setState to ensure 60fps performance
  scale.addListener(v => {
    currentScale.current = v.value;
  });
  pan.addListener(v => {
    currentPan.current = v;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: currentPan.current.x, y: currentPan.current.y });
        pan.setValue({ x: 0, y: 0 });
        initialDistance.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Double touches = Pinch zoom
          const touch1 = touches[0];
          const touch2 = touches[1];
          const distance = Math.sqrt(
            Math.pow(touch1.pageX - touch2.pageX, 2) + Math.pow(touch1.pageY - touch2.pageY, 2)
          );

          if (initialDistance.current === null) {
            initialDistance.current = distance;
          } else {
            const newScale = (distance / initialDistance.current) * currentScale.current;
            // Limit scale between 1x and 4x
            scale.setValue(Math.max(1, Math.min(newScale, 4)));
          }
        } else if (touches.length === 1 && currentScale.current > 1) {
          // Single touch = Pan / Scroll around when zoomed in
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // Bounce back if user scaled below 1
        if (currentScale.current < 1) {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        }
        // Center image back if scale is 1
        if (currentScale.current === 1) {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.image,
          {
            transform: [
              { scale: scale },
              { translateX: pan.x },
              { translateY: pan.y }
            ]
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
  }
});
