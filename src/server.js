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

/*
  To Do:
    1.
      INCLUDE PROPER START HTML AS AN INTRODUCTION

    2. 
      FINISH/UPLOAD PROJECT ONTO GITHUB
*/

const publicPath = path.join(process.cwd().replace(/\\src/, ""), "/views");

var httpsOptions = {
  key: fs.readFileSync('src/keys/private.key'),
  cert: fs.readFileSync('src/keys/certificate.crt'),
  ca: fs.readFileSync('src/keys/ca_bundle.crt')
}

app.use(session({
  secret: 'herkxsertyfhuygjk0f897^9@#',
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    secure: false
  }
}));
app.use(bodyParser.urlencoded({ extended: true })); 
app.use('/static', express.static('views'));
app.use(fileUpload());
const port = 80;

http.createServer(app).listen(80);
https.createServer(httpsOptions, app).listen(443);

app.get('/', (req, res) => {
  req.session.categories = [];
  req.session.singleClues = [];
  req.session.doubleClues = [];
  req.session.finalClue = "";
  req.session.values = [];
  req.session.singleAnswers = [];
  req.session.doubleAnswers = [];
  req.session.finalAnswer = "";
  req.session.isDeduction = "";
  req.session.teamOneWrong = [];
  req.session.teamTwoWrong = [];
  req.session.csvFile = "NONE";
  req.session.csvFileName = "NONE";

  res.sendFile(path.join(publicPath, "/html/index.html"));
});

app.post('/custom/select', (req, res) => {
  if ((!req.files) || (Object.keys(req.files).length === 0)) {
    return res.sendFile(path.join(publicPath, "/html/play/error-game.html"));
  }
  req.session.csvFile = req.files.csv_file.data;
  req.session.csvFileName = req.files.csv_file.name;

  req.session.isDeduction = "";

  req.session.categories = [];
  req.session.finalClue = "";
  req.session.singleClues = [];
  req.session.doubleClues = [];
  req.session.finalAnswer = "";
  req.session.singleAnswers = [];
  req.session.doubleAnswers = [];
  req.session.values = [];
  
  req.session.teamOneWrong = [];
  req.session.teamTwoWrong = [];

fs.writeFile(path.join(publicPath, "/custom/csv/" + req.session.csvFileName), req.session.csvFile, (err) => {
    if (err) throw err;

    req.session.tmpResults = [];
    req.session.results = [];
    fs.createReadStream(path.join(publicPath, '/custom/csv/', req.session.csvFileName))
    .pipe(csv.parse({ headers: false }))
    .on('error', error => console.error(error))
    .on('data', row => req.session.tmpResults.push(row.toString()))
    .on('end', rowCount =>  {
      for (var i = 0; i < req.session.tmpResults.length; i++) {
        req.session.tmpResults[i] = req.session.tmpResults[i].replace(/'/g, "\\'").replace(/"/g, "\\'");
        req.session.currentResult = req.session.tmpResults[i].toString().split(/,,/g);
        if (req.session.currentResult[0] != ",") {
          req.session.results.push(req.session.currentResult[0]);
        }
        if (req.session.currentResult[1] != ",") {
          req.session.results.push(req.session.currentResult[1]);
        }
        if (req.session.currentResult[2] != ",") {
          req.session.results.push(req.session.currentResult[2]);
        }
        if (req.session.currentResult[3] != ",") {
          req.session.results.push(req.session.currentResult[3]);
        }
        if (req.session.currentResult[4] != ",") {
          req.session.results.push(req.session.currentResult[4]);
       }
        if ((req.session.currentResult[5] != ",") && (req.session.currentResult[5] != "")) {
          req.session.results.push(req.session.currentResult[5]);
       }
        if ((req.session.currentResult[6] != ",") && (req.session.currentResult[6] != "")) {
          req.session.results.push(req.session.currentResult[6]);
        }
        if ((req.session.currentResult[7] != ",") && (req.session.currentResult[7] != "")) {
          req.session.results.push(req.session.currentResult[7]);
        }
        if ((req.session.currentResult[8] != ",") && (req.session.currentResult[8] != "")) {
          req.session.results.push(req.session.currentResult[8]);
        }
        if ((req.session.currentResult[9] != ",") && (req.session.currentResult[9] != "")) {
          req.session.results.push(req.session.currentResult[9]);
        }
        if ((req.session.currentResult[10] != ",") && (req.session.currentResult[10] != "")) {
          req.session.results.push(req.session.currentResult[10]);
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

        if ((containsNumbers(req.session.results[j].toString())) && (!req.session.results[j].includes("c")) && (!req.session.results[j].includes("C")) && (!req.session.results[j].includes("a")) && (!req.session.results[j].includes("A"))) {
          req.session.values.push(req.session.results[j].substring(req.session.results[j].indexOf(" ") + 1));
        }
      }
      fs.unlink(path.join(publicPath, "/custom/csv/" + req.session.csvFileName), (err) => {
        if (err) throw err;
      });

      const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/index.html')));
      $('#create-board-div').replaceWith('<div id="create-board-div" class="index-div"><form action="/custom/create-board" method="GET"><input class="create-board-input" type="submit" value="Create a Board"></form><form action="/custom/game-board" method="GET"><input class="select-buttons" type="submit" value="Play ' + req.session.csvFileName + '"><br><br></form><form action="/custom/edit-board" method="GET"><input class="select-buttons" type="submit" value="Edit ' + req.session.csvFileName + '"></form></div>');
      res.send($.html());
    });
  });
});

app.get('/custom/create-board', (req, res) => {
  res.sendFile(path.join(publicPath, "/html/edit/edit-board.html"));
});

app.get('/custom/edit-board', (req, res) => {
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/edit/edit-board.html')));
  
  $('#title').replaceWith('<title>Edit Your Board</title>');

  if (req.session.isDeduction) {
    $('#deduct-points-checkbox').replaceWith('<input id="deduct-points-checkbox" type="checkbox" checked>');
  }
  else {
    $('#deduct-points-checkbox').replaceWith('<input id="deduct-points-checkbox" type="checkbox">');
  }
  

  if (req.session.categories[6] == "NONE") {
    $('#double-checkbox').replaceWith('<input id="double-checkbox" type="checkbox">');
  }
  if (req.session.categories[12] == "NONE") {
    $('#final-checkbox').replaceWith('<input id="final-checkbox" type="checkbox">');
  }
  //SINGLE
  //Categories
  for (var i = 0; i < 6; i++) {
    $('#sC'+i+'A').replaceWith('<a id="sC'+i+'A" contenteditable="false">' + req.session.categories[i] + '</a>');
  }
  //Values
  for (var i = 0; i < 30; i++) {
    $('#sV'+i+'A').replaceWith('<a id="sV'+i+'A">' + req.session.values[i].replace("$", "") + "</a>");
  }
  //Questions/Answers
  for (var i = 0; i < 30; i++) {
    $('#sQ'+i+'A').replaceWith('<a id="sQ'+i+'A" contenteditable="false">' + req.session.singleClues[i] + '</a>');

    $('#sA'+i+'A').replaceWith('<a id="sA'+i+'A" contenteditable="false">' + req.session.singleAnswers[i] + '</a>');
  }

  //DOUBLE
  //Categories
  for (var i = 0; i < 6; i++) {
    $('#dC'+i+'A').replaceWith('<a id="dC'+i+'A" contenteditable="false">' + req.session.categories[i+6] + '</a>');
  }
  //Values
  for (var i = 0; i < 30; i++) {
    $('#dV'+i+'A').replaceWith('<a id="dV'+i+'A">' + req.session.values[i+30].replace("$", "") + "</a>");
  }
  //Questions/Answers
  for (var i = 0; i < 30; i++) {
    $('#dQ'+i+'A').replaceWith('<a id="dQ'+i+'A" contenteditable="false">' + req.session.doubleClues[i] + '</a>');

    $('#dA'+i+'A').replaceWith('<a id="dA'+i+'A" contenteditable="false">' + req.session.doubleAnswers[i] + '</a>');
  }

  //FINAL
  //Category
  $('#fCA').replaceWith('<a id="fCA" contenteditable="false">' + req.session.categories[req.session.categories.length - 1] + '</a>');
  //Question
  $('#fQA').replaceWith('<a id="fQA" contenteditable="false">' + req.session.finalClue + '</a>');
  //Clue
  $('#fAA').replaceWith('<a id="fAA" contenteditable="false">' + req.session.finalAnswer + '</a>');

  res.send($.html());
});

app.post('/custom/save', (req, res) => {
  req.session.isDeduction = req.body.deduct_points;

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
  req.session.categories[req.session.categories.length] = req.session.finalCategory;
  
  req.session.date = new Date();
  req.session.h = addZero((req.session.date.getHours() +24 ) %  12 || 12);
  req.session.m = addZero(req.session.date.getMinutes());
  req.session.s = addZero(req.session.date.getSeconds());
  req.session.time = req.session.h + "-" + req.session.m + "-" + req.session.s;
 
  req.session.currentDate = (req.session.date.toDateString() + " at " + req.session.time).replace(/ /g, "-");

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

    for (var i = 0; i < 30; i++) {
      req.session.tmpResults[i] = req.session.tmpResults[i]
      .replace("Single-Clue-"+i+",CLUE"+i, "Single-Clue-"+i+","+ req.session.singleClues[i])
      .replace("Single-Answer-"+i+",ANSWER"+i, "Single-Answer-"+i+","+ req.session.singleAnswers[i])
      .replace("Single-Category-"+i+",CATEGORY"+i, "Single-Category-"+i+","+ req.session.categories[i])
      
      .replace("Double-Clue-"+i+",CLUE"+i, "Double-Clue-"+i+","+ req.session.doubleClues[i])
      .replace("Double-Answer-"+i+",ANSWER"+i, "Double-Answer-"+i+","+ req.session.doubleAnswers[i])
      .replace("Double-Category-"+(i-7)+",CATEGORY"+(i-7), "Double-Category-"+(i-7)+","+ req.session.categories[i-1]) //i-7+6 = i-1

      .replace("Final-Clue,FINAL CLUE", "Final-Clue,"+ req.session.finalClue)
      .replace("Final-Answer,FINAL ANSWER", "Final-Answer,"+ req.session.finalAnswer)
      .replace("Final-Category,FINAL CATEGORY", "Final-Category,"+ req.session.categories[req.session.categories.length - 1])

      .replace("Deduct-Points,TRUE", "Deduct-Points,"+req.session.isDeduction)
      
      if ((i < 5)) {
        req.session.tmpResults[i] = req.session.tmpResults[i]
        .replace("S"+(req.session.singleCounter+0)+": "+req.session.singleValue, "S" +(req.session.singleCounter+0)+": " + req.session.values[i*6+0])
        .replace("S"+(req.session.singleCounter+1)+": "+req.session.singleValue, "S" +(req.session.singleCounter+1)+": " + req.session.values[i*6+1])
        .replace("S"+(req.session.singleCounter+2)+": "+req.session.singleValue, "S" +(req.session.singleCounter+2)+": " + req.session.values[i*6+2])
        .replace("S"+(req.session.singleCounter+3)+": "+req.session.singleValue, "S" +(req.session.singleCounter+3)+": " + req.session.values[i*6+3])
        .replace("S"+(req.session.singleCounter+4)+": "+req.session.singleValue, "S" +(req.session.singleCounter+4)+": " + req.session.values[i*6+4])
        .replace("S"+(req.session.singleCounter+5)+": "+req.session.singleValue, "S" +(req.session.singleCounter+5)+": " + req.session.values[i*6+5]);

        req.session.singleCounter += 6;
        req.session.singleValue += 200;
      }

      if ((i > 6) && (i < 12)) {
        req.session.tmpResults[i] = req.session.tmpResults[i]
        .replace("D"+(req.session.doubleCounter+0)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+0)+": " + req.session.values[(i-2)*6+0])
        .replace("D"+(req.session.doubleCounter+1)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+1)+": " + req.session.values[(i-2)*6+1])
        .replace("D"+(req.session.doubleCounter+2)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+2)+": " + req.session.values[(i-2)*6+2])
        .replace("D"+(req.session.doubleCounter+3)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+3)+": " + req.session.values[(i-2)*6+3])
        .replace("D"+(req.session.doubleCounter+4)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+4)+": " + req.session.values[(i-2)*6+4])
        .replace("D"+(req.session.doubleCounter+5)+": "+req.session.doubleValue, "D" +(req.session.doubleCounter+5)+": " + req.session.values[(i-2)*6+5]);

        req.session.doubleCounter += 6;
        req.session.doubleValue += 400;
      }
    }

    req.session.results = req.session.tmpResults.join("\n");

    fs.writeFile(path.join(publicPath, "/custom/csv/" + req.session.currentDate + ".csv"), req.session.results.toString(), (err) => {
      if (err) throw err;

      res.download(path.join(publicPath, "/custom/csv/" + req.session.currentDate + ".csv"), (err) => {
        if (err) throw err;
  
        fs.unlink(path.join(publicPath, "/custom/csv/" + req.session.currentDate + ".csv"), (err) => {
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
    return res.sendFile(path.join(publicPath, "/html/play/error-game.html"));
  }

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/game-board.html')));
  $('#is-deduction').replaceWith('<a id="is-deduction" hidden>'+req.session.isDeduction+'</a>');

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
    return res.sendFile(path.join(publicPath, "/html/play/error-game.html"));
  }
  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions.split('&');
  req.session.tmpTeamTwoWrong = req.query.team_two_wrong_questions.split('&');
  for (var i = 0; i < req.session.tmpTeamOneWrong.length; i++) {
    if (req.session.tmpTeamOneWrong[i] != '') {
      req.session.teamOneWrong.push(req.session.tmpTeamOneWrong[i]);
    }
  }
  for (var i = 0; i < req.session.tmpTeamTwoWrong.length; i++) {
    if (req.session.tmpTeamTwoWrong[i] != '') {
      req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong[i]);
    }
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/game-board.html')));

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
    return res.sendFile(path.join(publicPath, "/html/play/error-game.html"));
  }

  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions.split('&');
  req.session.tmpTeamTwoWrong = req.query.team_two_wrong_questions.split('&');

  for (var i = 0; i < req.session.tmpTeamOneWrong.length; i++) {
    if (req.session.tmpTeamOneWrong[i] != '') {
      req.session.teamOneWrong.push(req.session.tmpTeamOneWrong[i]);
    }
  }
  for (var i = 0; i < req.session.tmpTeamTwoWrong.length; i++) {
    if (req.session.tmpTeamTwoWrong[i] != '') {
      req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong[i]);
    }
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/final-game-board.html')));
  
  req.session.categories[req.session.categories.length - 1] = req.session.categories[req.session.categories.length - 1].replace(/\\/g, "");
  $(".final-category").replaceWith('<p id="final-category" class="final-category">' + req.session.categories[req.session.categories.length-1] + '</p>');
  $("#final-question").replaceWith('<td id="final-question">' + req.session.finalClue + '</td>');
  res.send($.html());
})

app.get('/custom/game-board/results', (req, res) => {
  req.session.winner;
  req.session.loser;
  req.session.teamWonScore;
  req.session.teamLostScore;
  req.session.teamOneReplace;
  req.session.teamTwoReplace;

  req.session.tmpTeamOneWrong = req.query.team_one_wrong_questions.split('&');
  req.session.tmpTeamTwoWrong = req.query.team_two_wrong_questions.split('&');

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/results.html')));

  for (var i = 0; i < req.session.tmpTeamOneWrong.length; i++) {
    if (req.session.tmpTeamOneWrong[i] != '') {
      req.session.teamOneWrong.push(req.session.tmpTeamOneWrong[i]);
    }
  }
  for (var i = 0; i < req.session.tmpTeamTwoWrong.length; i++) {
    if (req.session.tmpTeamTwoWrong[i] != '') {
      req.session.teamTwoWrong.push(req.session.tmpTeamTwoWrong[i]);
    }
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
    return res.sendFile(path.join(publicPath, "/html/play/error-answer.html"));
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
    return res.sendFile(path.join(publicPath, "/html/play/error-answer.html"));
  }

  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, 'custom/play/html/answer-board.html')));

  $('#title').replaceWith('<title>Double Answers</title>');

  for (var i = 0; i < 6; i++) {
    req.session.categories[i+6] = req.session.categories[i+6].replace(/\\/g, "");
    $('#c'+i).replaceWith('<th id="c' + i +'">' + req.session.categories[i+6] + '</th>');
  }
  for (var j = 0; j < 30; j++) {
    $('#a'+j).replaceWith('<td id="a' + j + '">' + req.session.doubleAnswers[j] + '</td>');
  }
  res.send($.html());
})

app.get('/custom/answer-board/final', (req, res) => {
  if (req.session.csvFile == "NONE") {
    return res.sendFile(path.join(publicPath, "/html/play/error-answer.html"));
  }
  const $ = cheerio.load(fs.readFileSync(path.join(publicPath, '/html/play/final-answer-board.html')));
  req.session.categories[req.session.categories.length - 1] = req.session.categories[req.session.categories.length - 1].replace(/\\/g, "");
  $("#c0").replaceWith('<th id="c0">' + req.session.categories[req.session.categories.length-1] + '</th>');
  $("#v0").replaceWith('<td id="v0">' + req.session.finalAnswer + '</td>');
  res.send($.html());
})

function containsNumbers(str) {
  return /\d/.test(str);
}

function addZero(i) {
  if (i < 10) {i = "0" + i}
  return i;
}