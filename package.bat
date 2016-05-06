del hbomb_firefox.xpi
del hbomb_chrome.zip
"C:\Program Files\7-Zip\7z.exe" a -r hbomb_chrome.zip -w .\chrome\manifest.json script.js hbomb.png
"C:\Program Files\7-Zip\7z.exe" a -r hbomb_firefox.zip -w .\firefox\manifest.json script.js hbomb.png
rename hbomb_firefox.zip hbomb_firefox.xpi