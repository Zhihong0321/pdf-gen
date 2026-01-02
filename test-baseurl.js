// Test script for baseUrl parameter
const http = require('http');

const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>baseUrl Test</h1>
    <p>This PDF was generated with baseUrl support.</p>
    <p>Test completed at: ${new Date().toLocaleString()}</p>
</body>
</html>
`;

// Test 1: Without baseUrl (backward compatibility)
console.log('\n=== Test 1: Without baseUrl (backward compatibility) ===\n');
const data1 = JSON.stringify({
  html: testHTML,
  options: {
    format: 'A4',
    printBackground: true
  }
});

const options1 = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/generate-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data1.length
  }
};

const req1 = http.request(options1, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    try {
      const result = JSON.parse(body);
      if (result.success) {
        console.log('✅ Test 1 PASSED - PDF generated without baseUrl');
        console.log('Download URL:', result.downloadUrl);
      } else {
        console.log('❌ Test 1 FAILED');
        console.log('Error:', body);
      }
    } catch (e) {
      console.log('❌ Test 1 FAILED - Invalid JSON response');
      console.log('Response:', body);
    }
  });
});

req1.on('error', (error) => {
  console.log('❌ Test 1 FAILED - Connection error');
  console.log('Error:', error.message);
});

req1.write(data1);
req1.end();

// Test 2: With baseUrl parameter
setTimeout(() => {
  console.log('\n=== Test 2: With baseUrl parameter ===\n');
  const data2 = JSON.stringify({
    html: testHTML,
    baseUrl: 'https://app.atap.solar',
    options: {
      format: 'A4',
      printBackground: true
    }
  });

  const options2 = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/generate-pdf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data2.length
    }
  };

  const req2 = http.request(options2, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Response Status:', res.statusCode);
      try {
        const result = JSON.parse(body);
        if (result.success) {
          console.log('✅ Test 2 PASSED - PDF generated with baseUrl');
          console.log('Download URL:', result.downloadUrl);
        } else {
          console.log('❌ Test 2 FAILED');
          console.log('Error:', body);
        }
      } catch (e) {
        console.log('❌ Test 2 FAILED - Invalid JSON response');
        console.log('Response:', body);
      }
      console.log('\n=== All tests completed ===\n');
    });
  });

  req2.on('error', (error) => {
    console.log('❌ Test 2 FAILED - Connection error');
    console.log('Error:', error.message);
  });

  req2.write(data2);
  req2.end();
}, 2000);
