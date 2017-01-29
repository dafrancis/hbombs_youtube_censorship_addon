rm -rf hbomb_firefox.xpi
rm -rf hbomb_chrome.zip
zip hbomb_chrome.zip -j ./chrome/manifest.json script.js hbomb.png
zip hbomb_firefox.zip  -j ./firefox/manifest.json script.js hbomb.png
mv hbomb_firefox.zip hbomb_firefox.xpi
