use std::ffi::CStr;
use std::os::raw::c_char;
use image::imageops::FilterType;
use image::GenericImageView;

#[no_mangle]
pub extern "C" fn compress_image(
    input_path: *const c_char,
    output_path: *const c_char,
    max_size: u32,
    quality: u8,
) -> bool {
    if input_path.is_null() || output_path.is_null() {
        return false;
    }

    let input_str = unsafe { CStr::from_ptr(input_path) }.to_str().unwrap_or("");
    let output_str = unsafe { CStr::from_ptr(output_path) }.to_str().unwrap_or("");

    if input_str.is_empty() || output_str.is_empty() {
        return false;
    }

    // Membaca gambar dari local path
    let img_result = image::open(input_str);
    let img = match img_result {
        Ok(i) => i,
        Err(_) => return false,
    };

    // Hitung dimensi baru (maksimal 800px di sisi terpanjang)
    let (width, height) = img.dimensions();
    let (new_width, new_height) = if width > height && width > max_size {
        let ratio = max_size as f32 / width as f32;
        (max_size, (height as f32 * ratio) as u32)
    } else if height > width && height > max_size {
        let ratio = max_size as f32 / height as f32;
        ((width as f32 * ratio) as u32, max_size)
    } else {
        (width, height)
    };

    // Resize menggunakan algoritma Lanczos3 (kualitas tinggi)
    let resized = img.resize(new_width, new_height, FilterType::Lanczos3);

    // Proses penyimpanan berdasarkan format (.webp atau .jpg)
    let lower_out = output_str.to_lowercase();
    if lower_out.ends_with(".webp") {
        let encoder = match webp::Encoder::from_image(&resized) {
            Ok(e) => e,
            Err(_) => return false,
        };
        // Encode WebP dengan persentase kualitas
        let webp_memory = encoder.encode(quality as f32);
        if std::fs::write(output_str, &*webp_memory).is_err() {
            return false;
        }
    } else if lower_out.ends_with(".jpg") || lower_out.ends_with(".jpeg") {
        let mut out_file = match std::fs::File::create(output_str) {
            Ok(f) => f,
            Err(_) => return false,
        };
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out_file, quality);
        if encoder.encode_image(&resized).is_err() {
            return false;
        }
    } else {
        // Fallback jika ekstensi tidak dikenali
        if resized.save(output_str).is_err() {
            return false;
        }
    }

    true
}
