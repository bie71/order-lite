import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Package, ShoppingCart, Settings } from 'lucide-react-native';

import OrdersListScreen from '../screens/OrdersListScreen';
import OrderFormScreen from '../screens/OrderFormScreen';
import ProductsListScreen from '../screens/ProductsListScreen';
import AddProductScreen from '../screens/AddProductScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MarketersListScreen from '../screens/MarketersListScreen';
import AddMarketerScreen from '../screens/AddMarketerScreen';
import ExpeditionsListScreen from '../screens/ExpeditionsListScreen';
import AddExpeditionScreen from '../screens/AddExpeditionScreen';

import CustomersListScreen from '../screens/CustomersListScreen';
import AddCustomerScreen from '../screens/AddCustomerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      <Stack.Screen name="OrderForm" component={OrderFormScreen} />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductsList" component={ProductsListScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="MarketersList" component={MarketersListScreen} />
      <Stack.Screen name="AddMarketer" component={AddMarketerScreen} />
      <Stack.Screen name="CustomersList" component={CustomersListScreen} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
      <Stack.Screen name="ExpeditionsList" component={ExpeditionsListScreen} />
      <Stack.Screen name="AddExpedition" component={AddExpeditionScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Pesanan') {
              return <ShoppingCart color={color} size={size} />;
            } else if (route.name === 'Produk') {
              return <Package color={color} size={size} />;
            } else if (route.name === 'Pengaturan') {
              return <Settings color={color} size={size} />;
            }
          },
          tabBarActiveTintColor: '#023c69',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Pesanan" component={OrdersStack} />
        <Tab.Screen name="Produk" component={ProductsStack} />
        <Tab.Screen name="Pengaturan" component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
