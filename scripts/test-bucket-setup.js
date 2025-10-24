// Quick setup script for Supabase Storage bucket
// Run this in your browser console while on your app (localhost:5173)
// This will create the bucket using the Supabase client

(async function setupBucket() {
  console.log('🚀 Setting up reverse-image-searches bucket...');
  
  try {
    // Import supabase from your app
    const { supabase } = await import('/src/lib/supabase.ts');
    
    // Try to create a test upload to verify bucket exists
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('reverse-image-searches')
      .upload('test/test.txt', testFile);
    
    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        console.error('❌ Bucket does not exist!');
        console.log('📋 Please create the bucket manually:');
        console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets');
        console.log('2. Click "New bucket"');
        console.log('3. Name: reverse-image-searches');
        console.log('4. Public: YES ✅');
        console.log('5. Click "Create bucket"');
        return;
      }
      
      console.error('❌ Upload test failed:', uploadError.message);
      return;
    }
    
    console.log('✅ Bucket exists and is accessible!');
    
    // Clean up test file
    await supabase.storage
      .from('reverse-image-searches')
      .remove(['test/test.txt']);
    
    console.log('✅ Setup complete! You can now upload images.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('Please create the bucket manually in Supabase Dashboard.');
  }
})();
