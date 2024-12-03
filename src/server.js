const fileUpload = require('express-fileupload');
const cheerio = require("cheerio");
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const csv = require("fast-csv");
const path = require("path");
const app = express();
const fs = require("fs");
const http = require('http');
const https = require('https');

const publicPath = path.join(process.cwd().replace(/\\src/, ""), "/views");

/*
  To Do:
    1. 
      Fix toggles on checkbox if Double is NONE
    1. 
      Fix Daily Doubles not transferring when editing existing board

    2.
      If press backspace so nothing is present in Cat, ANS, CLUE, exit
      out of cell, then can't edit it again.
    
    3. 
      Make so that special characteres can't be in values

    4.
      When editing a single value(CapsLock), change CORRECTLY in valuesList. 
      For more info, look roughly at Ln 518 in 'edit-board.html'
    
    5.
      Have backend(server.js) account for variable row/column sizes. .CSV work, Play Board work.
    
    6.
      Add 'Redesigned Single/Double Tables to account for variable Row/Column Sizes. This means you
      can now change how many Rows and/or Columns you have in the Create/Edit Board' to release notes

    7.
      Add 'Redesigned how editing values, questions, etc. so it automatically sets it when your mouse
      is off of it. Also made a triple click instead of a double click' to release notes
    
    8.
      Add 'made contenteditable to be false when not doing Double/Final Jeopardy' to release notes
    
    9. 
      Add 'made scale of Daily Double in the Double Board in the Create Board the same as the rest of the Daily Doubles' to release notes

    10. 
      Add 'updated instructions.html to reflect new changes.' to release notes

    11. 
      Add 'updated index.html 'How we use your Data' tab to better reflect the data being sent from you to us' to release notes

    10.
      IDEA: Possibly have a way to 'save' progress for Create Board, even when .CSV isn't saved. Useful for power outages, etc.
*/
var httpsOptions = {
  key: fs.readFileSync('src/keys/server.key'),
  cert: fs.readFileSync('src/keys/server.crt')
}

app.use(session({
  secret: randomGenerator(64),
  resave: true,
  saveUninitialized: false,
  cookie: {
    path: '/',
    secure: true
  }
}));

app.use(bodyParser.urlencoded({ extended: true })); 
app.use('/static', express.static('views'));
app.use(fileUpload());

http.createServer(app).listen(80);
https.createServer(httpsOptions, app).listen(443);

app.get('/', (req, res) => {
  req.session.testCookie = true;

  req.session.categories = [];
  req.session.singleClues = [];
  req.session.doubleClues = [];
  req.session.finalClue = "";
  req.session.values = [];
  req.session.singleAnswers = [];
  req.session.doubleAnswers = [];
  req.session.finalAnswer = "";
  req.session.teamOneWrong = [];
  req.session.teamTwoWrong = [];
  req.session.isDeduction = "";
  req.session.showDoubleButton = "";
  req.session.showFinalButton = "";
  req.session.showResultsButton = "";
  req.session.csvFile = "NONE";
  req.session.csvFileName = "NONE";

  res.sendFile(path.join(publicPath, "/html/index.html"));
});

app.get('/email', (req, res) => {
  res.sendFile(path.join(publicPath, "/html/email.html"));
});

app.post('/custom/select', (req, res) => {
  if ((!req.files) || (Object.keys(req.files).length === 0)) {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/error.html')));
    $('#title').replaceWith('<title id="title">Invalid CSV</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No file was selected. Make sure to press the "Choose File" and select a valid .CSV from the <a href="/custom/create-board">Create Board</a>page or from the <a href="https://docs.google.com/spreadsheets/d/1QcFzKwD9e8Zo0XDX68SelxTqUqe_u_bomV3A0zrwiYU/edit?usp=sharing">Google Sheets Template</a>.</p>');
    return res.send($.html());
  }
  if (req.session.testCookie != true) {
    return res.sendFile(path.join(publicPath, "/html/error.html"));
  }
  req.session.testCookie = true;
  req.session.categories = [];
  req.session.singleClues = [];
  req.session.doubleClues = [];
  req.session.finalClue = "";
  req.session.values = [];
  req.session.singleAnswers = [];
  req.session.doubleAnswers = [];
  req.session.finalAnswer = "";
  req.session.teamOneWrong = [];
  req.session.teamTwoWrong = [];
  req.session.isDeduction = "";
  req.session.showDoubleButton = "";
  req.session.showFinalButton = "";
  req.session.showResultsButton = "";
  req.session.singleRowCount = "";
  req.session.singleColumnCount = "";
  req.session.doubleRowCount = "";
  req.session.doubleColumnCount = "";

  req.session.csvFile = req.files.csv_file.data;
  req.session.csvFileName = req.files.csv_file.name;

  fs.writeFile(path.join(publicPath, "/custom/csv/" + req.session.csvFileName), req.session.csvFile, (err) => {
    if (err) throw err;

    req.session.tmpResults = [];
    req.session.results = [];
    req.session.currentResult = [];
    fs.createReadStream(path.join(publicPath, '/custom/csv/', req.session.csvFileName))
    .pipe(csv.parse({ headers: false }))
    .on('error', error => console.error(error))
    .on('data', row => req.session.tmpResults.push(row.toString()))
    .on('end', rowCount =>  {
      if ((req.session.tmpResults[0] == null) || (!req.session.tmpResults[0].toString().includes("Single-Clue-0"))) {
        const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/error.html')));
        $('#title').replaceWith('<title id="title">Invalid CSV</title>');
        $('#header').replaceWith('<h1 id="header">Invalid Format</h1>');
        $('#text').replaceWith('<p id="text"> The .CSV was formatted incorrectly. Make sure to use the <a href="/custom/create-board">Create Board</a> or the <a href="https://docs.google.com/spreadsheets/d/1QcFzKwD9e8Zo0XDX68SelxTqUqe_u_bomV3A0zrwiYU/edit?usp=sharing">Google Sheets Template</a> and download as .CSV file. </p>');
        return res.send($.html());
      }
      for (var i = 0; i < req.session.tmpResults.length; i++) {
        req.session.tmpResults[i] = req.session.tmpResults[i].replace(/'/g, "\\'").replace(/"/g, "\\'");
        req.session.currentResult = req.session.tmpResults[i].toString().split(/,,/g);

        for (var k = 0; k < 13; k++) {
          if ((req.session.currentResult[k] != ",") && (req.session.currentResult[k] != "")) {
            req.session.results.push(req.session.currentResult[k]);
          }
        }
      }

      req.session.categoryIndex = 0;
      req.session.singleClueIndex = 0;
      req.session.doubleClueIndex = 0;
      req.session.singleAnswerIndex = 0;
      req.session.doubleAnswerIndex = 0;

      for (var j = 0; j < req.session.results.length; j++) {
        if (req.session.results[j].includes("Deduct-Points")) {
          if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "TRUE") {
            req.session.isDeduction = true;
          }
          else if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "FALSE") {
            req.session.isDeduction = false;
          }
        }

        if (req.session.results[j].includes("Show-Double-Button")) {
          if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "TRUE") {
            req.session.showDoubleButton = true;
          }
          else if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "FALSE") {
            req.session.showDoubleButton = false;
          }
        }
        if (req.session.results[j].includes("Show-Final-Button")) {
          if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "TRUE") {
            req.session.showFinalButton = true;
          }
          else if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "FALSE") {
            req.session.showFinalButton = false;
          }
        }
        if (req.session.results[j].includes("Show-Results-Button")) {
          if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "TRUE") {
            req.session.showResultsButton = true;
          }
          else if (req.session.results[j].substring(req.session.results[j].indexOf(',') + 1) == "FALSE") {
            req.session.showResultsButton = false;
          }
        }
        if (req.session.results[j].includes("Single-Column-Count")) {
          req.session.singleColumnCount = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }
        if (req.session.results[j].includes("Single-Row-Count")) {
          req.session.singleRowCount = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }
        if (req.session.results[j].includes("Double-Column-Count")) {
          req.session.doubleColumnCount = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }
        if (req.session.results[j].includes("Double-Row-Count")) {
          req.session.doubleRowCount = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }

        if (req.session.results[j].includes("Category")) {
          req.session.categories[req.session.categoryIndex] = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
          req.session.categoryIndex++;
        }
        if ((req.session.results[j].includes("Single-Clue")) && (!req.session.results[j].includes("Final-Clue")) && (!req.session.results[j].includes("Single-Daily-Double"))) {
          req.session.singleClues[req.session.singleClueIndex] = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
          req.session.singleClueIndex++;
        }
        if ((req.session.results[j].includes("Double-Clue")) && (!req.session.results[j].includes("Final-Clue")) && (!req.session.results[j].includes("Single-Daily-Double"))) {
          req.session.doubleClues[req.session.doubleClueIndex] = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
          req.session.doubleClueIndex++;
        }
        else if (req.session.results[j].includes("Final-Clue")) {
          req.session.finalClue = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }

        if ((req.session.results[j].includes("Single-Answer")) && (!req.session.results[j].includes("Final-Answer"))) {
          req.session.singleAnswers[req.session.singleAnswerIndex] = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
          req.session.singleAnswerIndex++;
        }
        if ((req.session.results[j].includes("Double-Answer")) && (!req.session.results[j].includes("Final-Answer"))) {
          req.session.doubleAnswers[req.session.doubleAnswerIndex] = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
          req.session.doubleAnswerIndex++;
        }
        else if (req.session.results[j].includes("Final-Answer")) {
          req.session.finalAnswer = req.session.results[j].substring(req.session.results[j].indexOf(',') + 1);
        }

        if ((req.session.results[j].includes(": $")) || (req.session.results[j].includes(": DISABLED"))) {
          req.session.values.push(req.session.results[j].substring(req.session.results[j].indexOf(" ") + 1));
        }
      }
      
      fs.unlink(path.join(publicPath, "/custom/csv/" + req.session.csvFileName), (err) => {
        if (err) throw err;
      });

      const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/index.html')));
      $('#create-board-div').replaceWith('<div id="create-board-div" class="index-div"><form action="/custom/create-board" method="GET"><input class="create-board-input" type="submit" value="Create a Board"></form><form action="/custom/game-board" method="GET"><input class="select-buttons" type="submit" value="Play ' + req.session.csvFileName + '"><br><br></form><form action="/custom/edit-board" method="GET"><input class="select-buttons" id="edit-button" type="submit" value="Edit ' + req.session.csvFileName + '"></form></div>');
      $('#select-board-div').replaceWith('');
      res.send($.html());
    });
  });
});

app.get('/custom/create-board', (req, res) => {
  res.sendFile(path.join(publicPath, "/html/edit/edit-board.html"));
});

app.get('/custom/create-board/instructions', (req, res) => {
  res.sendFile(path.join(publicPath, "/html/edit/instructions.html"));
});

app.get('/custom/edit-board', (req, res) => {
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/edit/edit-board.html')));
  if (req.session.testCookie != true) {
    return res.sendFile(path.join(publicPath, "/html/error.html"));
  }
  req.session.singleCategories = req.session.categories.slice(0, 8);
  req.session.doubleCategories = req.session.categories.slice(8, req.session.categories.length - 1);
  req.session.finalCategory = req.session.categories[req.session.categories.length - 1];
  req.session.singleValues = req.session.values.slice(0, 80);
  req.session.doubleValues = req.session.values.slice(80, req.session.values.length);
  req.session.singleDailyDoubles = [];
  req.session.doubleDailyDoubles = [];

  $('#is-edit-board').replaceWith('<a id="is-edit-board" hidden>true</a>');
  $('#user-name-input').replaceWith('<input type="text" value="'+req.session.csvFileName+'" id="user-name-input" name="user_name_input" placeholder=".CSV File Name">');
  
  for (var i = 0; i < 80; i++) {
    if (req.session.singleValues[i].includes("DD: ")) {
      req.session.singleDailyDoubles[i] = "checked";
      req.session.singleValues[i] = req.session.singleValues[i].replace('DD: ', '');
    }
    else {
      req.session.singleDailyDoubles[i] = "unchecked";
    }

    if (req.session.doubleValues[i].includes("DD: ")) {
      req.session.doubleDailyDoubles[i] = "checked";
      req.session.doubleValues[i] = req.session.doubleValues[i].replace('DD: ', '');
    }
    else {
      req.session.doubleDailyDoubles[i] = "unchecked";
    }
  }

  $('#edit-single-column-count').replaceWith('<a id="edit-single-column-count" hidden>'+req.session.singleColumnCount+'</a>');
  $('#edit-single-row-count').replaceWith('<a id="edit-single-row-count" hidden>'+req.session.singleRowCount+'</a>');
  $('#edit-single-categories').replaceWith('<a id="edit-single-categories" hidden>'+req.session.singleCategories+'</a>');
  $('#edit-single-clues').replaceWith('<a id="edit-single-clues" hidden>'+req.session.singleClues+'</a>');
  $('#edit-single-values').replaceWith('<a id="edit-single-values" hidden>'+req.session.singleValues+'</a>');
  $('#edit-single-answers').replaceWith('<a id="edit-single-answers" hidden>'+req.session.singleAnswers+'</a>');
  $('#edit-single-daily-doubles').replaceWith('<a id="edit-single-daily-doubles" hidden>'+req.session.singleDailyDoubles+'</a>');
  
  $('#edit-double-column-count').replaceWith('<a id="edit-double-column-count" hidden>'+req.session.doubleColumnCount+'</a>');
  $('#edit-double-row-count').replaceWith('<a id="edit-double-row-count" hidden>'+req.session.doubleRowCount+'</a>');
  $('#edit-double-categories').replaceWith('<a id="edit-double-categories" hidden>'+req.session.doubleCategories+'</a>');
  $('#edit-double-clues').replaceWith('<a id="edit-double-clues" hidden>'+req.session.doubleClues+'</a>');
  $('#edit-double-values').replaceWith('<a id="edit-double-values" hidden>'+req.session.doubleValues+'</a>');
  $('#edit-double-answers').replaceWith('<a id="edit-double-answers" hidden>'+req.session.doubleAnswers+'</a>');
  $('#edit-double-daily-doubles').replaceWith('<a id="edit-double-daily-doubles" hidden>'+req.session.doubleDailyDoubles+'</a>');
  
  $('#title').replaceWith('<title>Edit Your Board</title>');
  $('#columnRange').val($('#columnRange option:contains("'+req.session.singleColumnCount+'")').val());
  $('#rowRange').val($('#rowRange option:contains("'+req.session.singleRowCount+'")').val());

  $('#fCA').replaceWith('<a id="fCA" contenteditable="false">'+req.session.finalCategory+'</a>');
  $('#fQA').replaceWith('<a id="fQA" contenteditable="false">'+req.session.finalClue+'</a>');
  $('#fAA').replaceWith('<a id="fAA" contenteditable="false">'+req.session.finalAnswer+'</a>');

  if (req.session.isDeduction) {
    $('#deduct-points-checkbox').replaceWith('<input id="deduct-points-checkbox" type="checkbox" checked>');
  }
  else {
    $('#deduct-points-checkbox').replaceWith('<input id="deduct-points-checkbox" type="checkbox">');
  }
  
  if (req.session.showDoubleButton) {
    $('#show-double-checkbox').replaceWith('<input id="show-double-checkbox" type="checkbox" checked></a>');
  }
  else {
    $('#show-double-checkbox').replaceWith('<input id="show-double-checkbox" type="checkbox"></a>');
  }
  if (req.session.showFinalButton) {
    $('#show-final-checkbox').replaceWith('<input id="show-final-checkbox" type="checkbox" checked></a>');
  }
  else {
    $('#show-final-checkbox').replaceWith('<input id="show-final-checkbox" type="checkbox"></a>');
  }
  if (req.session.showResultsButton) {
    $('#show-results-checkbox').replaceWith('<input id="show-results-checkbox" type="checkbox" checked></a>');
  }
  else {
    $('#show-results-checkbox').replaceWith('<input id="show-results-checkbox" type="checkbox"></a>');
  }
  if (req.session.categories[req.session.singleColumnCoun] == "NONE") {
    $('#double-checkbox').replaceWith('<input id="double-checkbox" type="checkbox">');
    $('#show-double-checkbox').replaceWith('<input id="show-double-checkbox" type="checkbox" disabled></a>');
  }
  if (req.session.categories[req.session.categories.length - 1] == "NONE") {
    $('#final-checkbox').replaceWith('<input id="final-checkbox" type="checkbox">');
    $('#show-final-checkbox').replaceWith('<input id="show-final-checkbox" type="checkbox" disabled></a>');
  }

  res.send($.html());
});

app.post('/custom/save', (req, res) => {
  req.session.isDeduction = req.body.deduct_points;
  req.session.showDoubleButton = req.body.show_double_button;
  req.session.showFinalButton = req.body.show_final_button;
  req.session.showResultsButton = req.body.show_results_button;

  req.session.singleRowCount = req.body.single_row_count;
  req.session.singleColumnCount = req.body.single_column_count;
  req.session.doubleRowCount = req.body.double_row_count;
  req.session.doubleColumnCount = req.body.double_column_count;

  req.session.singleCategories = req.body.single_categories_csv.split('&');
  req.session.singleValues = req.body.single_values_csv.split('&');
  req.session.singleClues = req.body.single_clues_csv.split('&');
  req.session.singleAnswers = req.body.single_answers_csv.split('&');

  req.session.doubleCategories = req.body.double_categories_csv.split('&');
  req.session.doubleValues = req.body.double_values_csv.split('&');
  req.session.doubleClues = req.body.double_clues_csv.split('&');
  req.session.doubleAnswers = req.body.double_answers_csv.split('&');
  
  req.session.finalCategory = req.body.final_category_csv;
  req.session.finalClue = req.body.final_clue_csv;
  req.session.finalAnswer = req.body.final_answer_csv;

  req.session.values = [...req.session.singleValues, ...req.session.doubleValues];
  req.session.categories = [...req.session.singleCategories, ...req.session.doubleCategories];
  req.session.categories.push(req.session.finalCategory);
  
  req.session.userFileName = req.body.user_name_input;
  
  if (req.session.userFileName == "") {
    req.session.date = new Date();
    req.session.h = addZero((req.session.date.getHours() +24 ) %  12 || 12);
    req.session.m = addZero(req.session.date.getMinutes());
    req.session.s = addZero(req.session.date.getSeconds());
    req.session.time = req.session.h + "-" + req.session.m + "-" + req.session.s;
 
    req.session.currentName = (req.session.date.toDateString() + " at " + req.session.time).replace(/ /g, "-");
  }
  else {
    req.session.currentName = req.session.userFileName;
  }
  
  req.session.tmpResults = [];
  fs.createReadStream(path.join(publicPath, '/custom/csv/template/TEMPLATE DO NOT DESTROY.csv'))
  .pipe(csv.parse({ headers: false }))
  .on('error', error => console.error(error))
  .on('data', row => req.session.tmpResults.push(row.toString()))
  .on('end', rowCount =>  {
    req.session.singleValue = 200;
    req.session.doubleValue = 400;
    req.session.singleCounter = 0;
    req.session.doubleCounter = 0;

    for (var i = 0; i < 80; i++) {
      req.session.tmpResults[i] = req.session.tmpResults[i]
      .replace("Single-Clue-"+i+",CLUE"+i, "Single-Clue-"+i+","+ req.session.singleClues[i])
      .replace("Single-Answer-"+i+",ANSWER"+i, "Single-Answer-"+i+","+ req.session.singleAnswers[i])
      .replace("Single-Category-"+i+",CATEGORY"+i, "Single-Category-"+i+","+ req.session.categories[i])
      
      .replace("Double-Clue-"+i+",CLUE"+i, "Double-Clue-"+i+","+ req.session.doubleClues[i])
      .replace("Double-Answer-"+i+",ANSWER"+i, "Double-Answer-"+i+","+ req.session.doubleAnswers[i])
      .replace("Double-Category-"+(i-9)+",CATEGORY"+(i-9), "Double-Category-"+(i-9)+","+ req.session.categories[i-1]) //i-7+6 = i-1

      .replace("Final-Clue,FINAL CLUE", "Final-Clue,"+ req.session.finalClue)
      .replace("Final-Answer,FINAL ANSWER", "Final-Answer,"+ req.session.finalAnswer)
      .replace("Final-Category,FINAL CATEGORY", "Final-Category,"+ req.session.categories[req.session.categories.length - 1])

      .replace("Deduct-Points,TRUE", "Deduct-Points,"+req.session.isDeduction)
      .replace("Show-Double-Button,FALSE", "Show-Double-Button,"+req.session.showDoubleButton)
      .replace("Show-Final-Button,FALSE", "Show-Final-Button,"+req.session.showFinalButton)
      .replace("Show-Results-Button,FALSE", "Show-Results-Button,"+req.session.showResultsButton)

      .replace("Single-Column-Count,6", "Single-Column-Count,"+req.session.singleColumnCount)
      .replace("Single-Row-Count,5", "Single-Row-Count,"+req.session.singleRowCount)
      .replace("Double-Column-Count,6", "Double-Column-Count,"+req.session.doubleColumnCount)
      .replace("Double-Row-Count,5", "Double-Row-Count,"+req.session.doubleRowCount)
      
      if ((i < 11)) {
        for (var j = 0; j < 8; j++) {
          req.session.tmpResults[i] = req.session.tmpResults[i].replace("S"+(req.session.singleCounter+j)+": "+req.session.singleValue, "S" +(req.session.singleCounter+j)+": " + req.session.singleValues[i*8+j]);
        }
        req.session.singleCounter += 8;
        req.session.singleValue += 200;
      }

      if ((i > 10) && (i < 21)) {
        for (var k = 0; k < 8; k++) {
          req.session.tmpResults[i] = req.session.tmpResults[i].replace("D"+(req.session.doubleCounter+k)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+k)+": " + req.session.doubleValues[(i-11)*8+k]);
        }
        req.session.doubleCounter += 8;
        req.session.doubleValue += 400;
      }
    }
    req.session.results = req.session.tmpResults.join("\n");
    fs.writeFile(path.join(publicPath, "/custom/csv/" + req.session.currentName + ".csv"), req.session.results.toString(), (err) => {
      if (err) throw err;

      res.download(path.join(publicPath, "/custom/csv/" + req.session.currentName + ".csv"), (err) => {
        if (err) throw err;
  
        fs.unlink(path.join(publicPath, "/custom/csv/" + req.session.currentName + ".csv"), (err) => {
          if (err) throw err;
        });
      });
    });
  });
});

app.post('/custom/error', (req, res) => {
  res.redirect('/id');
});

app.get('/custom/game-board', function(req, res) {
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/error.html')));
    $('#title').replaceWith('<title id="title">Invalid CSV</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No file was selected or the .CSV was formatted incorrectly. Make sure to press the "Choose File" and select a valid .CSV from the "Create Board" page.</p>');
    return res.send($.html());
  }
  if (req.session.testCookie != true) {
    return res.sendFile(path.join(publicPath, "/html/error.html"));
  }

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/game-board.html')));
  $('#is-deduction').replaceWith('<a id="is-deduction" hidden>'+req.session.isDeduction+'</a>');
  $('#show-double-button').replaceWith('<a id="show-double-button" hidden>'+req.session.showDoubleButton+'</a>');
  $('#show-final-button').replaceWith('<a id="show-final-button" hidden>'+req.session.showFinalButton+'</a>');
  $('#show-results-button').replaceWith('<a id="show-results-button" hidden>'+req.session.showResultsButton+'</a>');

  if (req.session.categories[6] == "NONE") {
    $('#is-double').replaceWith('<a id="is-double" hidden>false</a>');
  }

  if (req.session.categories[12] == "NONE") {
    $('#is-final').replaceWith('<a id="is-final" hidden>false</a>');
  }

  for (var i = 0; i < 6; i++) {
    req.session.categories[i] = req.session.categories[i].replace(/\\/g, "");
    $('#c'+i).replaceWith('<th id="c' + i +'">' + req.session.categories[i] + '</th>');
  }
    
  for (var j = 0; j < 30; j++) {
    if (req.session.values[j].toString().includes("DD: ")) {
      req.session.currentValue = req.session.values[j].substring(4);
    }
    else {
      req.session.currentValue = req.session.values[j];
    }
    $('#v'+j).replaceWith('<td id="v'+j+ '" onclick="replaceText(\'v' + j + '\',\'' + req.session.values[j] + '\',\'' + req.session.categories[j%6] + '\',\'' + req.session.singleClues[j] + '\');" >' + req.session.currentValue + '</td>');
  }
  res.send($.html());
});

app.get('/custom/game-board/double', (req, res) => {
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/error.html')));
    $('#title').replaceWith('<title id="title">Invalid CSV</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No file was selected or the .CSV was formatted incorrectly. Make sure to press the "Choose File" and select a valid .CSV from the "Create Board" page.</p>');
    return res.send($.html());
  }
  if (req.session.testCookie != true) {
    return res.sendFile(path.join(publicPath, "/html/error.html"));
  }

  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions.split('&');
  req.session.tmpTeamTwoWrong = req.query.team_one_wrong_questions.split('&');

  for (var i = 0; i < req.session.tmpTeamOneWrong.length; i++) {
    if (req.query.team_one_wrong_questions.split('&')[i] != '') {
      req.session.teamOneWrong.push(req.session.tmpTeamOneWrong[i]);
    }
  }
  for (var j = 0; j < req.session.tmpTeamTwoWrong; j++) {
    if (req.session.tmpTeamTwoWrong[j] != '') {
      req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong[j]);
    }
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/game-board.html')));
  $('#is-deduction').replaceWith('<a id="is-deduction" hidden>'+req.session.isDeduction+'</a>');
  $('#show-double-button').replaceWith('<a id="show-double-button" hidden>'+req.session.showDoubleButton+'</a>');
  $('#show-final-button').replaceWith('<a id="show-final-button" hidden>'+req.session.showFinalButton+'</a>');
  $('#show-results-button').replaceWith('<a id="show-results-button" hidden>'+req.session.showResultsButton+'</a>');

  $('#title').replaceWith('<title>Double Jeopardy</title>');

  if (req.session.categories[6] == "NONE") {
    $('#is-double').replaceWith('<a id="is-double" hidden>false</a>');
  }

  if (req.session.categories[12] == "NONE") {
    $('#is-final').replaceWith('<a id="is-final" hidden>false</a>');
  }

  for (var i = 0; i < 6; i++) {
    req.session.currentCategory = req.session.categories[i+6].replace(/\\/g, "");

    $('#c'+i).replaceWith('<th id="c' + i +'">' + req.session.currentCategory + '</th>');
  }
  for (var j = 0; j < 30; j++) {
    var k = j+30;
    if (req.session.values[k].toString().includes("DD: ")) {
      req.session.currentValue = req.session.values[k].substring(4);
    }
    else {
      req.session.currentValue = req.session.values[k];
    }
    $('#v'+j).replaceWith('<td id="v'+j+ '" onclick="replaceText(\'v' + j + '\',\'' + req.session.currentValue + '\',\'' + req.session.categories[k%12] + '\',\'' + req.session.doubleClues[j] + '\');" >' + req.session.currentValue + '</td>');
  }
  $("#answer-board-url").replaceWith('<a id="answer-board-url" hidden>/custom/answer-board/double</a>');
  res.send($.html());
});

app.get('/custom/game-board/final', (req, res) => {
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/error.html')));
    $('#title').replaceWith('<title id="title">Invalid CSV</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No file was selected or the .CSV was formatted incorrectly. Make sure to press the "Choose File" and select a valid .CSV from the "Create Board" page.</p>');
    return res.send($.html());
  }
  if (req.session.testCookie != true) {
    return res.sendFile(path.join(publicPath, "/html/error.html"));
  }
  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions.split('&');
  req.session.tmpTeamTwoWrong = req.query.team_one_wrong_questions.split('&');

  for (var i = 0; i < req.session.tmpTeamOneWrong.length; i++) {
    if (req.query.team_one_wrong_questions.split('&')[i] != '') {
      req.session.teamOneWrong.push(req.session.tmpTeamOneWrong[i]);
    }
  }
  for (var j = 0; j < req.session.tmpTeamTwoWrong; j++) {
    if (req.session.tmpTeamTwoWrong[j] != '') {
      req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong[j]);
    }
  }

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/final-game-board.html')));
  $('#show-results-button').replaceWith('<a id="show-results-button" hidden>'+req.session.showResultsButton+'</a>');
  
  req.session.categories[req.session.categories.length - 1] = req.session.categories[req.session.categories.length - 1].replace(/\\/g, "");
  $(".final-category").replaceWith('<p id="final-category" class="final-category">' + req.session.categories[req.session.categories.length-1] + '</p>');
  $("#final-question").replaceWith('<td id="final-question">' + req.session.finalClue + '</td>');
  res.send($.html());
});

app.get('/custom/game-board/results', (req, res) => {
  req.session.winner;
  req.session.loser;
  req.session.teamWonScore;
  req.session.teamLostScore;
  req.session.teamOneReplace;
  req.session.teamTwoReplace;

  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions;
  req.session.tmpTeamTwoWrong = req.query.team_two_wrong_questions;

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/results.html')));

  if (req.session.tmpTeamOneWrong != '') {
    req.session.teamOneWrong.push(req.session.tmpTeamOneWrong);
  }
  if (req.session.tmpTeamTwoWrong != '') {
    req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong);
  }
  
  if (req.query.winner == "team-two") {
    req.session.winner = "Team Two";
    req.session.loser = "Team One";
    req.session.teamWonScore = req.query.team_two_score;
    req.session.teamLostScore = req.query.team_one_score;
    req.session.teamOneReplace = '<td id="team-lost-questions">';
    req.session.teamTwoReplace = '<td id="team-won-questions">';
  }
  else {
    req.session.winner = "Team One";
    req.session.loser = "Team Two";
    req.session.teamWonScore = req.query.team_one_score;
    req.session.teamLostScore = req.query.team_two_score;
    req.session.teamOneReplace = '<td id="team-won-questions">';
    req.session.teamTwoReplace = '<td id="team-lost-questions">';
  }

  var noWrongText = "Congrats! You had no wrong questions!";
  var noWrongWin = '<td id="team-won-questions" style="text-align: center;">'
  var noWrongLose = '<td id="team-lost-questions" style="text-align: center;">'

  if (req.query.winner == "none") {
    req.session.teamOneReplace = '<td>';
    $('#team-won').replaceWith('<th>'+req.session.winner+'</th>');
    $('#team-lost').replaceWith('<th id="team-lost">'+req.session.loser+'</th>');

    $('#team-won-value').replaceWith('<td>$'+req.session.teamWonScore+'</td>');
    $('#team-lost-value').replaceWith('<td id="team-lost-value">$'+req.session.teamLostScore+'</td>');  
    req.session.winner = "None";
  }
  else {
    $('#team-won').replaceWith('<th id="team-won">'+req.session.winner+'</th>');
    $('#team-lost').replaceWith('<th id="team-lost">'+req.session.loser+'</th>');

    $('#team-won-value').replaceWith('<td id="team-won-value">$'+req.session.teamWonScore+'</td>');
    $('#team-lost-value').replaceWith('<td id="team-lost-value">$'+req.session.teamLostScore+'</td>');
  }

  if (req.session.winner == "None") {
    $('#has-winner').replaceWith('<td id="has-winner" hidden>');
    $('#no-winner').replaceWith('<td id="no-winner">It\'s a <p>Tie</p>! Both scores are the same at $' + req.query.team_one_score + '! <a>Click to Continue</a></td>');
  }
  else {
    $('#has-winner').replaceWith('<td id="has-winner">Team <p>' +  req.session.winner.substring(5)  + '</p> is the winner by <p>$' + (req.session.teamWonScore - req.session.teamLostScore) + '</p> and a total score of <p>$' + req.session.teamWonScore + '</p>!<a>Click to Continue</a></td>');
  }
  for (var i = 0; i < req.session.teamOneWrong.length; i++) {
    req.session.teamOneReplace += (i+1)+'. <a class="question">'+req.session.teamOneWrong[i]+'</a><br>';
  }
  req.session.teamOneReplace += '</td>'
  for (var j = 0; j < req.session.teamTwoWrong.length; j++) {
    req.session.teamTwoReplace += (j+1)+'. <a class="question">'+req.session.teamTwoWrong[j]+'</a><br>';
  }
  req.session.teamTwoReplace += '</td>'
  if ((req.session.teamOneWrong != "") && (req.session.teamTwoWrong != "") && (req.session.winner == "Team One")) {
    $('#team-won-questions').replaceWith(req.session.teamOneReplace);
    $('#team-lost-questions').replaceWith(req.session.teamTwoReplace);
  }
  else if ((req.session.teamOneWrong != "") && (req.session.teamTwoWrong == "") && (req.session.winner == "Team One")) {
    $('#team-won-questions').replaceWith(req.session.teamOneReplace);
    $('#team-lost-questions').replaceWith(noWrongLose+noWrongText);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong != "") && (req.session.winner == "Team One")) {
    $('#team-won-questions').replaceWith(noWrongWin+noWrongText);
    $('#team-lost-questions').replaceWith(req.session.teamTwoReplace);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong == "") && (req.session.winner == "Team One")) {
    $('#team-won-questions').replaceWith();
    $('#team-lost-questions').replaceWith(noWrongLose+noWrongText);
  }
  else if ((req.session.teamOneWrong != "")  && (req.session.teamTwoWrong != "") && (req.session.winner == "Team Two")) {
    $('#team-won-questions').replaceWith(req.session.teamTwoReplace);
    $('#team-lost-questions').replaceWith(req.session.teamOneReplace);
  }

  else if ((req.session.teamOneWrong != "") && (req.session.teamTwoWrong == "") && (req.session.winner == "Team Two")) {
    $('#team-won-questions').replaceWith(noWrongWin+noWrongText);
    $('#team-lost-questions').replaceWith(req.session.teamOneReplace);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong != "") && (req.session.winner == "Team Two")) {
    $('#team-won-questions').replaceWith(req.session.teamTwoReplace);
    $('#team-lost-questions').replaceWith(noWrongLose+noWrongText);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong == "") && (req.session.winner == "Team Two")) {
    $('#team-won-questions').replaceWith();
    $('#team-lost-questions').replaceWith(noWrongLose+noWrongText);
  }

  else if ((req.session.teamOneWrong != "") && (req.session.teamTwoWrong != "") && (req.session.winner == "None")) {
    $('#team-won-questions').replaceWith(req.session.teamOneReplace);
    $('#team-lost-questions').replaceWith(req.session.teamTwoReplace);
  }
  else if ((req.session.teamOneWrong != "") && (req.session.teamTwoWrong == "") && (req.session.winner == "None")) {
    $('#team-won-questions').replaceWith(req.session.teamOneReplace);
    $('#team-lost-questions').replaceWith(noWrongLose+noWrongText);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong != "") && (req.session.winner == "None")) {
    $('#team-won-questions').replaceWith('<td style="text-align: center;">'+noWrongText);
    $('#team-lost-questions').replaceWith(req.session.teamTwoReplace);
  }
  else if ((req.session.teamOneWrong == "") && (req.session.teamTwoWrong == "") && (req.session.winner == "None")) {
    $('#team-won-questions').replaceWith('<td style="text-align: center;">'+noWrongText);
    $('#team-lost-questions').replaceWith();
  }
  res.send($.html());
});

app.get('/custom/answer-board', (req, res) => {  
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/index.html')));
    $('#title').replaceWith('<title id="title">No file selected</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No CSV file selected. Please make sure to select a file by going to "Choose File" then pressing "Choose Jeopardy Board"</p>');
    return res.send($.html());
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/answer-board.html')));
  for (var i = 0; i < 6; i++) {
    req.session.categories[i] = req.session.categories[i].replace(/\\/g, "");
    $('#c'+i).replaceWith('<th id="c' + i +'">' + req.session.categories[i] + '</th>');
  }
  for (var j = 0; j < 30; j++) {
    $('#a'+j).replaceWith('<td id="a' + j + '">' + req.session.singleAnswers[j] + '</td>');
  }
  res.send($.html());
});

app.get('/custom/answer-board/double', (req, res) => {
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/index.html')));
    $('#title').replaceWith('<title id="title">No file selected</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No CSV file selected. Please make sure to select a file by going to "Choose File" then pressing "Choose Jeopardy Board"</p>');
    return res.send($.html());
  }

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/answer-board.html')));

  $('#title').replaceWith('<title>Double Answers</title>');

  for (var i = 0; i < 6; i++) {
    req.session.categories[i+6] = req.session.categories[i+6].replace(/\\/g, "");
    $('#c'+i).replaceWith('<th id="c' + i +'">' + req.session.categories[i+6] + '</th>');
  }
  for (var j = 0; j < 30; j++) {
    $('#a'+j).replaceWith('<td id="a' + j + '">' + req.session.doubleAnswers[j] + '</td>');
  }
  res.send($.html());
});

app.get('/custom/answer-board/final', (req, res) => {
  if (req.session.csvFile == "NONE") {
    const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/index.html')));
    $('#title').replaceWith('<title id="title">No file selected</title>');
    $('#header').replaceWith('<h1 id="header">No file selected</h1>');
    $('#text').replaceWith('<p id="text">No CSV file selected. Please make sure to select a file by going to "Choose File" then pressing "Choose Jeopardy Board"</p>');
    return res.send($.html());
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/final-answer-board.html')));
  req.session.categories[req.session.categories.length - 1] = req.session.categories[req.session.categories.length - 1].replace(/\\/g, "");
  $("#c0").replaceWith('<th id="c0">' + req.session.categories[req.session.categories.length-1] + '</th>');
  $("#v0").replaceWith('<td id="v0">' + req.session.finalAnswer + '</td>');
  res.send($.html());
});

function randomGenerator(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function addZero(i) {
  if (i < 10) {i = "0" + i}
  return i;
}