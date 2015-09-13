window.startTime = window.performance ? window.performance.timing.navigationStart : Date.now(); // mobile safari doesn't have timing api


$.cloudinary.config({
  cloud_name: Meteor.settings["public"].CLOUDINARY_CLOUD_NAME
});


window.isHighDensity = ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 124dpi), only screen and (min-resolution: 1.3dppx), only screen and (min-resolution: 48.8dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (min-device-pixel-ratio: 1.3)').matches)) || (window.devicePixelRatio && window.devicePixelRatio > 1.3));

window.trimInput = function(val) {
  return val.replace(/^\s*|\s*$/g, "");
};


window.plainTextPaste = function(e) {
  var clipboardData = (e.originalEvent || e).clipboardData;
  e.preventDefault();
  return document.execCommand('insertText', false, clipboardData.getData('text/plain'));
};


window.isValidPassword = function(p) {
  if (p.length >= 6) {
    return true;
  } else {
    return false;
  }
};

window.checkValidEmail = function(email) {
  if (email.length === 0 ) {
    return { status: false, message: 'Please enter your e-mail address' };
  } else if (!SimpleSchema.RegEx.Email.test(email)) {
    return { status: false, message: 'Invalid e-mail address' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidName = function(name) {
  if (name.length === 0 ) {
    return { status: false, message: 'Please enter your first and last name' };
  } else if (name.length > 127 ) {
    return { status: false, message: 'Too long (maximum 127 characters)' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidPassword = function(p1) {
  if (p1.length === 0 ) {
    return { status: false, message: 'Please enter a password' };
  } else if (!isValidPassword(p1)) {
    return { status: false, message: 'Too short (minimum 6 characters)' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidPasswordConfirmation = function(p1, p2) {
  if (p2.length && p1!==p2) {
    return { status: false, message: 'Passwords do not match' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidUsername = function(username) {
  var usernameRegex = /^[a-zA-Z0-9-_]+$/;
  if (username.length === 0 ) {
    return { status: false, message: 'Please enter a username' };
  } else if (username.length < 3) {
  	return { status: false, message: 'Too short (minimum 3 chars)' };
  } else if (username.length > 15) {
  	return { status: false, message: 'Too long (maximum 15 chars)' };
  } else if (!username.match(usernameRegex)) {
    return { status: false, message: 'Please only use letters, numbers, -, and _' };
  } else {
    return { status: true, message: false };
  }
};

window.incrementReactiveVar = function(rv){
  return rv.set(rv.get() + 1);
};

window.textContentHelper = function() {
  var textContent, rows, placeholder;
  if (this.type === 'text'){
    textContent = this.content || '';
    rows = 40;
    placeholder = '';
  }
  else {
    textContent = this.description || '';
    rows = 3;
    placeholder = 'Add a caption'
  }

  if (!Session.get('curateMode')) {
    if (textContent.length){
      return '<div class="text-content" dir="auto">' + _.escape(textContent).replace(/\n/g, "<br>") + '</div>';
    } else {
      return ''
    }
  } else {
    return '<textarea name="content" class="text-content editable" rows="' + rows + '" placeholder="' + placeholder +  '" dir="auto">' + _.escape(textContent) + '</textarea>';
  }
};

window.pluralizeMediaType = function(mediaType){
  switch(mediaType){
    case 'news':
      return 'news';
    case 'text':
      return 'text';
    case 'chat':
      return 'chat';
    case 'twitter':
      return 'tweets';
    case 'audio':
      return 'audio';
    default:
      return mediaType + 's'
  }
};

window.contextTypes = [
  "stream",
  "text",
  "image",
  "map",
  "video",
  "twitter",
  "audio",
  "link",
  "news"
];

window.contextTypesPlusChat = _.union(contextTypes, ['chat']);


//window.typeHelpers = _.object(contextTypes, _.map(contextTypes, function(type) {
//  return function() {
//    return this.type === type;
//  };
//}));



window.horizontalBlockHelpers = _.extend({}, {
  selected: function(){
    return true;
  },
  annotation: textContentHelper
});


var i = 0;

window.count = function(){
  return i++;
};

window.getCurrentContext = function(){
  var currentContextId = Session.get("currentContextId");
  if (currentContextId){
    var currentContext = Deepstreams.findOne({shortId: Session.get("streamShortId")}).getContextById(currentContextId)
    return newTypeSpecificContextBlock(currentContext); // session will only store the vanilla object
  }
};

window.setCurrentContext = function(contextBlock){
  Session.set("currentContextId", contextBlock._id);
};

window.clearCurrentContext = function(){
  Session.set("currentContextId", null);
};

window.soloOverlayContextModeActive = function(){
  var currentContext = getCurrentContext();
  return currentContext && currentContext.soloModeLocation === 'overlay';
};


window.emptyContextBlockOfCurrentMediaDataType = function(){
  return newTypeSpecificContextBlock({type: Session.get('mediaDataType')});
};


window.contextHelpers = _.object(contextTypesPlusChat, _.map(contextTypesPlusChat, function(type) {
  return function() {
    return Session.get('mediaDataType') === type;
  };
}));
