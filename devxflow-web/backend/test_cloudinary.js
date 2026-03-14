// Test Cloudinary image upload - run from backend directory
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const cloudinary = require('cloudinary').v2;

async function testUpload() {
  console.log('=== Cloudinary Upload Test ===\n');
  
  // Check environment variables
  console.log('Checking Cloudinary config...');
  console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'Not set');
  console.log('API_KEY:', process.env.CLOUDINARY_API_KEY || 'Not set');
  console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('\n❌ Cloudinary credentials not configured!');
    console.log('\nPlease add to .env file:');
    console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('CLOUDINARY_API_KEY=your_api_key');
    console.log('CLOUDINARY_API_SECRET=your_api_secret');
    return;
  }
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  const imagePath = path.join(__dirname, '..', '..', '.zzz_prompt', 'pub2.jpg');
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`\n❌ Image not found: ${imagePath}`);
    return;
  }
  
  console.log(`\n✓ Image found: ${imagePath}`);
  
  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    console.log(`  Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log('\nUploading to Cloudinary...');
    
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'test-uploads',
      resource_type: 'image'
    });
    
    console.log('\n✅ Upload successful!');
    console.log(`  URL: ${result.secure_url}`);
    console.log(`  Public ID: ${result.public_id}`);
    
    console.log('\n=== Test Complete ===');
    console.log('You can view the uploaded image at the URL above.');
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    if (error.message.includes('401')) {
      console.log('\nTip: Check your Cloudinary API credentials');
    }
  }
}

testUpload();
