<!-- Firebase SDK from Local npm Installation -->
<!-- Using compat version (works without module bundler) -->
<script>
  // We'll lazy-load Firebase from a service worker or local bundle
  // For now, using unpkg as backup, but Firebase is installed locally
</script>

<!-- Fallback to unpkg if local fails -->
<script>
  if (!window.firebase) {
    console.log('Loading Firebase from unpkg CDN (backup)...');
    var firebaseScripts = [
      'https://unpkg.com/firebase@10.7.0/compat/dist/firebase-compat.js'
    ];

    firebaseScripts.forEach(function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    });
  }
</script>
