// UI FUNCTIONS
function appendTestsToUI(testCases) {
  for (let test in testCases) {
    let t = fixTestCaseName(test);
    localStorage.setItem(t, testCases[test]);
    $("#tests").append(`<input type="checkbox" class="testcase" value="${t}" onmouseover="showTestConversation(this)" onmouseout="removeTestConversation(this)"> ${t} </br>`);
  }

  showForm();
}

function showTestConversation(event) {
  let id = event.value;
  let test = localStorage.getItem(id);
  let ft = formatTestFromCSV(test, id);

  addTestConversationHeader();
  for (let line in ft) {
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

function getCheckedTests() {
  let checkedTests = $(".testcase:checked");
  let range = Array.from(Array(checkedTests.length).keys());

  return range.map(test => checkedTests[test].value);
}

function addDownloadElement(element){
  document.body.appendChild(element);
}

function removeDownloadElment(element){
  document.body.removeChild(element);
}

// READ FUNCTIONS
function openFile(event) {
  const input = event.target;
  const testFiles = input.files;

  for (let i = 0; i < testFiles.length; i++) {
    let reader = new FileReader();

    reader.onload = function() {
      let fileData = reader.result;
      let testCases = convertTests(fileData);

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
function testsToHash(fileData, testCaseName="", testHash={}, currentTest=[]) {
  let testLine = null;

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
function createTests() {
  let checkedTests = getCheckedTests();
  let tests = getTests(checkedTests);

  writeToCSV(tests);
  return false;
}

function writeToCSV(tests) {
  const csvHeaders = ["url", "user", "pass", "domain"];
  const prefilledElements = ["\n<INSTANCE URL>", "", "", "<DOMAIN CODE>"];
  const testHeaders = ["\ntest case", "utterance", "matcher", "expected result"];
  let csvTests = [];
  let rowBuilder = [];
  let counter = 0;

  for (let test in tests) {
    let fcs = fixCommaSeparation(tests[test]);

    for (let line in fcs) {
      let rowItem = fcs[line];
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
  let element = createDownloadElment(testFile);
  element.click();

  removeDownloadElment(element);
}

function createDownloadElment(testFile) {
  let fileName = "testcases.csv";
  let element = document.createElement('a');

  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(testFile));
  element.setAttribute('download', fileName);
  addDownloadElement(element);

  return element;
}

// FORMAT FUNCTIONS
function getTests(selectedTests) {
  let range = Array.from(Array(selectedTests.length).keys());

  return range.map(test =>
    localStorage.getItem(selectedTests[test]).split(",")
  );
}

function formatTestFromCSV(test, testName) {
  var test = test.replace(testName, "");
  var str = "";

  for (let i = 0; i < test.length; i++) {
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
  for (let i = 0; i < test.length; i++) {
    if ((test[i] === "") || (test[i] === "Full") || (test[i] === "Partial")) {
      // do nothing
    } else if (test[i][0] === " ") {
      line.splice(-1, 1); //remove last utterance from array
      let cu = correctedUtterance(test[i-1], test[i]);
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
  for (let i = 0; i < test.length; i++) {
    if (test[i][0] === " ") {
      currentRow.splice(-1, 1); //remove last utterance from array
      // replacing comma b/c of csv parsing and I'm lazy!
      let utterance = test[i-1] + ";" + test[i];
      currentRow.push(utterance);
    } else {
      currentRow.push(test[i]);
    }
  }
  return currentRow;
}

function fixTestCaseName(testName) {
  var str = "";
  for (let i = 0; i < testName.length; i++) {
    if (testName[i] != "\"") {
      str += testName[i];
    } else {
      str += "'";
    }
  }
  return str;
}
