window.notifyFeature = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#EA1D75' // remix-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifySuccess = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#1DB259' // action-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyCard = function(cardDataObject){
  $.amaran({
      content: {
        message: cardDataObject.message,
        color: 'white',
        bgcolor: '#4D4D4D' // action-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyLogin = function(){
  var user = Meteor.user();
  var name = user.profile.name ? user.profile.name.split(' ')[0] : user.profile.username;
  notifySuccess('Welcome ' + name + '!');
};


window.notifyError = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#ff1b0c' // danger-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyInfo = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#585094' // panel-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyDeploy = function(message, sticky){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#585094' // panel-color
      },
      'position' :'top right',
      theme:'colorful',
      sticky: sticky,
      clearAll: true
    }
  );
  $('.amaran').addClass('migration-notification');
};
