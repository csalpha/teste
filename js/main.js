var rts = []; // rt array
var dwells = []; // dwell times array
var score = 0; // score variable
var timeouts = 0; // number of timeouts
var outcomes = {}; // object containing outcome variables
var results = []; // array to store trials details and responses
var frameSequence = []; // object containing the sequence of frames and their properties
var ch; // chain of timeouts for stimulus presentation
var frame; // single frame object

// output a message and execute an action
function showAlert(alertMessage, alertButtonText, action, timeout) {
  // set the message to display
  getID('alertText').innerHTML = alertMessage;

  // if args contain button text,
  // show the button and set the required action for it,
  // otherwise hide the button
  if (alertButtonText && !timeout) {
    getID('alertButton').style.width = '300px';
    getID('alertButton').style.margin = '0 auto';
    getID('alertButton').style.display = 'block';
    getID('alertButton').innerHTML = alertButtonText;
    getID('alertButton').onclick = action;
    showCursor('document.body');
  } else getID('alertButton').style.display = 'none';

  // if args contain a timeout,
  // trigger the action automatically when timeout expires
  if (timeout) setTimeout(action, timeout);

  showFrame('alertBox');
}

// specify actions to take on user input
tmbUI.onreadyUI = function () {
  // clear the stimulus chain, in case it's still running
  clearChainTimeouts(ch);

  // store the results
  results.push({
    type: frame.type, // one of practice or test
    foreperiod: frame.delay, // go! foreperiod
    response: tmbUI.response, // the key or button pressed
    rt: tmbUI.rt, // delay b/w onset of go! and response
    dwell: tmbUI.dwell, // keyup - keydown
    state: tmbUI.status, // state of the response handler
  });

  // if the input event returns a timeout,
  // stop the sequence and advise the participant
  if (tmbUI.status == 'timeout') {
    // rewind the frame sequence by one frame,
    // so that the same frame is displayed again
    frameSequence.unshift(frame);

    // count timeouts
    if (frame.type == 'test') timeouts++;

    showAlert(
      '<br>Please respond within 2 seconds.<br><br>' +
        'When you see <b>GO!</b>,<br>' +
        (hasTouch
          ? '<b>TAP</b> as quickly as you can.<br><br>'
          : 'press the <b>SPACE BAR</b> ' + 'as quickly as you can.<br><br>'),
      'Click here to retry',
      function () {
        hideCursor('document.body');
        showFrame('null');
        setTimeout(function () {
          nextTrial();
        }, 1000);
      }
    );
  }
  // else all is good, advance to the next trial
  else {
    if (frame.type == 'test') {
      rts.push(tmbUI.rt);
      dwells.push(tmbUI.dwell);
    }

    nextTrial();
  }
};

// iterate through the frameSequence object,
// implementing stimulus presentation,
// response collection and data management
function nextTrial() {
  // read the frame sequence one frame at a time
  if ((frame = frameSequence.shift())) {
    // check if it's the startup frame
    if (frame.type == 'begin')
      showAlert(frame.message, 'Click here for instructions', function () {
        nextTrial();
      });
    // else if it's a message frame, show it
    else if (frame.type == 'message')
      showAlert(frame.message, 'Click here to continue', function () {
        hideCursor('document.body');
        showFrame('null');
        setTimeout(function () {
          nextTrial();
        }, 1000);
      });
    // else show the go signal
    else {
      hideCursor('document.body');

      // chain the stimulus presentation
      ch = chainTimeouts(
        function () {
          requestAnimationFrame(function () {
            showFrame(null);
          });
        },
        700,
        function () {
          requestAnimationFrame(function () {
            showFrame('hold');
          });
        },
        frame.delay,
        function () {
          requestAnimationFrame(function () {
            showFrame('go');
            tmbUI.getInput();
          });
        }
      );
    }
  }
  // else if the sequence is empty, we are done!
  else {
    showCursor('document.body');

    // compute score and outcome variables
    if (rts.length) {
      // score is 10000/avgRT, capped at 100 for avgRT<=100ms
      score = rts.average();
      score = score < 100 ? 100 : 10000 / score;
      score = score.round(2);

      outcomes.sRT_meanRT = rts.average().round(2);
      outcomes.sRT_medianRT = rts.median().round(2);
      outcomes.sRT_sdRT = rts.sd().round(2);
    }

    media = outcomes.sRT_meanRT;
    mediana = outcomes.sRT_medianRT;
    desvio = outcomes.sRT_sdRT;

    console.table('score: ', score);
    console.table('media: ', outcomes.sRT_meanRT);
    console.table('median: ', outcomes.sRT_medianRT);
    console.table('sd: ', outcomes.sRT_sdRT);

    tmbSubmitToServer(results, score, outcomes);
  }
}

// generate the frameSequence object,
// where each object's element codes the parameters
// for a single trial/frame
function setFrameSequence() {
  var testMessage;

  // messages
  testMessage = {
    begin:
      '<br><h2>Fast Reactions Test</h2><br>' +
      'How fast can you react?<br><br>',
    practice:
      '<br><h3>Practice:</h3><br>' +
      'When you see <b>GO!</b><br>' +
      (hasTouch ? '<b>TAP</b> ' : 'press the <b>SPACE BAR</b> ') +
      'as quickly as you can.<br><br>' +
      'Use a finger on your writing hand.<br><br>',
    test:
      '<br>Excellent!<br>' +
      'You have completed the practice.<br><br>' +
      "Now let's do 30 more.<br><br>" +
      'When you see <b>GO!</b><br>' +
      (hasTouch ? '<b>TAP</b> ' : 'press the <b>SPACE BAR</b> ') +
      'as quickly as you can.<br><br>',
  };

  // Practice sequence

  // type of frame to display
  var frameType = [
    'begin',
    'message',
    'practice',
    'practice',
    'practice',
    'message',
  ];

  // message to display
  var frameMessage = [
    testMessage.begin,
    testMessage.practice,
    '',
    '',
    '',
    testMessage.test,
  ];

  // push all components into the frames chain
  for (var i = 0; i < 1; i++) {
    frameSequence.push({
      type: frameType[i],
      message: frameMessage[i],
      delay: 500,
    });
  }

  // Test sequence

  var frameDelay = [
    1300, 700, 700, 700, 700, 1100, 700, 1100, 900, 900, 700, 700, 1300, 1100,
    1300, 700, 900, 700, 1500, 700, 1500, 900, 900, 700, 1100, 900, 700, 900,
    700, 900,
  ];

  for (i = 0; i < 1; i++) {
    frameSequence.push({
      type: 'test',
      message: '',
      delay: frameDelay[i],
    });
  }
}

// on page load completion, set up initial parameters,
// call the frameSequence generator
// and start the trials sequence
window.onload = function () {
  // determine events to listen to
  if (hasTouch) tmbUI.UIevents = ['taps', 'clicks'];
  else tmbUI.UIevents = ['keys'];

  // set response timeout to 2 seconds
  tmbUI.timeout = 2000;

  // disable spurious user interaction
  disableSelect();
  disableRightClick();
  disableDrag();

  // create the trials chain and start the testing sequence
  setFrameSequence();
  nextTrial();
};
