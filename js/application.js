// UI FUNCTIONS
function appendTestsToUI(testCases) {
  for (var test in testCases) {
    var t = fixTestCaseName(test);
    localStorage.setItem(t, testCases[test]);
    $("#tests").append(`<input type="checkbox" class="testcase" value="${t}" onmouseover="showTestConversation(this)" onmouseout="removeTestConversation(this)"> ${t} </br>`);
  }

  showForm();
}

function showTestConversation(event) {
  var id = event.value;
  var test = localStorage.getItem(id);
  var ft = formatTestFromCSV(test, id);

  addTestConversationHeader();
  for (var line in ft) {
    $("#testConversation").append(`<p class="testconv">${ft[line]}</p>`);
  }

  $("#testConversation").show();
}

function addTestConversationHeader() {
  $("#testConversation").append(`<h3 class="testconv">Conversation:</h3>`);
}

function removeTestConversation(event) {
  $(".testconv").remove();
}

function hideForm() {
  $("#form").hide();
}

function showForm() {
  $("#form").show();
}

function getCheckedTests(event) {
  var checkedTests = [];

  $(".testcase:checked").each(function() {
    checkedTests.push($(this).val());
  });
  return checkedTests;
}

function addDownloadElement(element){
  document.body.appendChild(element);
}

function removeDownloadElment(element){
  document.body.removeChild(element);
}

// READ FUNCTIONS
function openFile(event) {
  var input = event.target;
  var testFiles = input.files;

  for (var i = 0; i < testFiles.length; i++) {
    var reader = new FileReader();

    reader.onload = function() {
      var fileData = reader.result;
      var testCases = convertTests(fileData);

      appendTestsToUI(testCases);
    };

    reader.readAsText(testFiles[i]);
  }
}

// csv conversion taken from https://stackoverflow.com/questions/1293147/javascript-code-to-parse-csv-data
function convertTests(strData) {
  var testFileData = [[]];
  var arrMatches = null;
  var strMatchedValue = null;
  var objPattern = new RegExp((
      "(\\" + "," + "|\\r?\\n|\\r|^)" +
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
      "([^\"\\" + "," + "\\r\\n]*))"
    ),
    "gi"
  );

  while (arrMatches = objPattern.exec(strData)){
    var strMatchedDelimiter = arrMatches[1];
    if (strMatchedDelimiter.length && (strMatchedDelimiter != ",")) {
      testFileData.push([]);
    }
    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(
        new RegExp("\"\"", "g"), "\""
      );
    } else {
      strMatchedValue = arrMatches[3];
    }

    testFileData[testFileData.length - 1].push(strMatchedValue);
  }

  testFileData = testFileData.slice(3, -1);
  return testsToHash(testFileData);
}

// done recursively out of bordem... refactor to fit codebase style
function testsToHash(fileData, testCaseName, testHash, currentTest) {
  var testCaseName = testCaseName || "";
  var testHash = testHash || {};
  var currentTest = currentTest || [];
  var testLine = null;

  if (fileData.length == 0) {
    testHash[testCaseName] = currentTest; // add test to hash
    return testHash;
  }
  // fileData[0][0] is a test name...
  if (fileData[0][0] != "") {
    // we set currentTest to an empty array everytime we add a test to the hash
    // so we check for an empty array...
    if (currentTest.length == 0) {
      testCaseName = fileData[0][0];
      testLine = fileData[0];

      currentTest.push(testLine); // create test

      fileData.shift();
      testsToHash(fileData, testCaseName, testHash, currentTest);
    } else {
      testHash[testCaseName] = currentTest;
      testsToHash(fileData, testCaseName, testHash, []);
    }
  } else {
    testLine = fileData[0];
    currentTest.push(testLine); //add line to test

    fileData.shift();
    testsToHash(fileData, testCaseName, testHash, currentTest);
  }
  return testHash;
}

// CREATE FUNCTIONS
function createTests(event) {
  var checkedTests = getCheckedTests(event);
  var tests = getTests(checkedTests);

  writeToCSV(tests);
  return false;
}

function writeToCSV(tests) {
  var csvHeaders = ["url", "user", "pass", "domain"];
  var prefilledElements = ["\n<INSTANCE URL>", "", "", "<DOMAIN CODE>"];
  var testHeaders = ["\ntest case", "utterance", "matcher", "expected result"];
  var csvTests = [];
  var rowBuilder = [];
  var counter = 0;

  for (var test in tests) {
    var fcs = fixCommaSeparation(tests[test]);

    for (var line in fcs) {
      var rowItem = fcs[line];
      if (counter < 4 && line === fcs.length) {
        csvTests.push(rowBuilder);  // push remaining tests lines
      } else if (counter < 4 && counter === 0) { // start new row
        rowBuilder.push(`\n${rowItem}`);
        counter += 1;
      } else if (counter < 4) {
        rowBuilder.push(rowItem);
        counter += 1;
      } else if (counter === 4) {
        csvTests.push(rowBuilder);
        rowBuilder = [];
        counter = 0;
      }
    }
  }
  download([csvHeaders, prefilledElements, testHeaders, csvTests].toString());
}

function download(testFile) {
  var element = createDownloadElment(testFile);
  element.click();

  removeDownloadElment(element);
}

function createDownloadElment(testFile) {
  var fileName = "testcases.csv";
  var element = document.createElement('a');

  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(testFile));
  element.setAttribute('download', fileName);
  addDownloadElement(element);

  return element;
}

// FORMAT FUNCTIONS
function getTests(selectedTests) {
  var tests = [];

  for (var test in selectedTests) {
    tests.push(localStorage.getItem(selectedTests[test]).split(","));
  }
  return tests;
}

function formatTestFromCSV(test, testName) {
  var test = test.replace(testName, "");
  var str = "";
  for (var i = 0; i < test.length; i++) {
    if ((test[i] + test[i + 1]) === ",,") {
      str += "";
    } else if (test[i] != ",") {
      str += test[i];
    } else {
      str += ",";
    }
  }
  return format(str.split(","));
}

function format(test) {
  var line = [];
  for (var i = 0; i < test.length; i++) {
    if ((test[i] === "") || (test[i] === "Full") || (test[i] === "Partial")) {
      // do nothing
    } else if (test[i][0] === " ") {
      line.splice(-1, 1); //remove last utterance from array
      var cu = correctedUtterance(test[i-1], test[i]);
      line.push(cu);
    } else {
      line.push(test[i]);
    }
  }
  return line;
}

function correctedUtterance(previousUtterance, currentUtterance) {
  return previousUtterance + ", " + currentUtterance;
}

function fixCommaSeparation(test) {
  var currentRow = [];
  for (var i = 0; i < test.length; i++) {
    if (test[i][0] === " ") {
      currentRow.splice(-1, 1); //remove last utterance from array
      // replacing comma b/c of csv parsing and I'm lazy!
      var utterance = test[i-1] + ";" + test[i];

      currentRow.push(utterance);
    } else {
      currentRow.push(test[i]);
    }
  }
  return currentRow;
}

function fixTestCaseName(testName) {
  var str = "";
  for (var i = 0; i < testName.length; i++) {
    if (testName[i] != "\"") {
      str += testName[i];
    } else {
      str += "'";
    }
  }
  return str;
}
