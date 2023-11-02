# Jeopardy Workshop
The source code for https://jeopardyworkshop.com, which is a website to easily create, review, and edit your custom jeopardy board.
I use a node module called cheerio to edit and modify html on the fly in the server. 
To deploy the server, I use a custom-made docker container running on a Raspberry Pi 4

# Hosting
To host this nodeJS website locally, make sure you have [NodeJS](https://nodejs.org/) installed then download source code for this project.
Do the following commands in a terminal, pointed to the jeopardy-workshop directory: `npm install cheerio && npm install fast-csv && npm install express-fileupload && npm install express-session && npm install express-http-to-https.`
Then, do the following command to start the server: `node src/server.js` This command may fail, stating it can't find `certificate.crt` or something similar. I do not provide the certificates of my website, as I do not know if that poses risks to me or my hosting abilities. To get rid of this error, find `var httpsOptions = {...` and delete that block of code. You can also remove `https.createServer(httpsOptions, app).listen(443);`
After that, go to [localhost](http://localhost), and you should see the website. Enjoy!
