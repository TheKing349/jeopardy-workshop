# Jeopardy Workshop
The source code for https://jeopardyworkshop.com, which is a website to easily create, review, and edit your custom jeopardy board.
I use a node module called cheerio to edit and modify html on the fly in the server. 
To deploy the server, I use a custom-made docker container running on a Raspberry Pi 4

# Hosting
To host this nodeJS website locally, make sure you have [NodeJS](https://nodejs.org/) installed then download source code for this project.
Do the following commands in a terminal, pointed to the jeopardy-workshop directory: `npm install`
Then, do the following command to start the server: `node src/server.js` This command may fail, stating it can't find `server.key` or something similar. This is because, in order to run HTTPS, you need local certificates installed on the server, which I do not provide, as that would pose a security risk to the website. To get rid of this error, find `var httpsOptions = {...` and delete that block of code. You can also remove `https.createServer(httpsOptions, app).listen(443);`
After that, go to [localhost](http://localhost), and you should see the website. Enjoy!
