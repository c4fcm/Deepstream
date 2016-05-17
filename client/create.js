window.enclosingAnchorTag = null;
window.selectedNode = null;

window.saveCallback =  function(err, success, cb) {
  var saveUIUpdateDelay = 300;
  setTimeout(function(){
    if (err) {
      return Session.set('saveState', 'failed');
    }
    if (!success) {
      return Session.set('saveState', 'failed');
    }
    Session.set('saveState', 'saved');
  }, saveUIUpdateDelay);
  if(cb){
    cb(err, success);
  }
  if (err){
    throw(err);
  }
};

window.refreshContentDep = new Tracker.Dependency();


var scrollToRelativePosition = function(offset) {
  var selectedNarrative = $('.vertical-narrative-section.selected');
  if (selectedNarrative){
    $('body,html').animate({
      scrollTop: $('.vertical-narrative-section.selected').position().top + offset
    }, 200, 'easeInCubic');
  }
};



Template.stream_search.events({
  'mouseenter .horizontal-narrative-section' () {
    document.body.style.overflow = 'hidden';
  },
  'mouseleave .horizontal-narrative-section' (){
    document.body.style.overflow='auto';
  }
});

Template.stream_search.onDestroyed(function(){
  document.body.style.overflow='auto';
});

Template.add_context.helpers({
  listMode (){
    return emptyContextBlockOfCurrentMediaDataType().searchList;
  },
  searchListTemplate (){
    return emptyContextBlockOfCurrentMediaDataType().searchListTemplate;
  },
  searchSoloTemplate (){
    return emptyContextBlockOfCurrentMediaDataType().searchSoloTemplate;
  }
});

Template.content_icons.helpers(contextHelpers);


Template.content_icons.helpers({
  disableAllButStream (){
    // return bool to determine if first creation step
    return _.contains(['find_stream'], this.creationStep);
  }
});


Template.content_icons.events(_.object(_.map(contextTypes, function(type){
    return 'click .' + type + '-button'
  })
  , _.map(contextTypes, function(type) {
    return function() {
      Session.set('mediaDataType', type);
    };
  }))
);

Template.content_icons.events({
  'click button' () {
    clearCurrentContext(); // clear current context whenever click on a context button
  }
});

Template.add_context.events({
  'mouseenter .search-results-container' () {
    document.body.style.overflow = 'hidden';
  },
  'mouseleave .search-results-container' (){
    document.body.style.overflow='auto';
  }
});

Template.add_context.onDestroyed(function(){
  document.body.style.overflow='auto';
});

window.addStream = function(stream, template) {
  Session.set('query', null); // clear query so it doesn't seem like you're editing this card next time open the new card menu
  Session.set('saveState', 'saving');
  template.focusResult.set(null);

  Meteor.call('addStreamToStream', Session.get("streamShortId"), stream, function(err, streamId){
    saveCallback(err, streamId);
  });
};

window.addContext = function(contextBlock) { // add or suggest
  var user;

  if (user = Meteor.user()) {
    contextBlock.authorId = user._id;
    contextBlock.rank = 0; // places above existing ranked context
    if(mainPlayer.getElapsedTime()){
      contextBlock.videoMarker = mainPlayer.getElapsedTime(); 
    }
  } else {
    notifyInfo('Please log in to suggest content');
    Session.set('signingIn', true);
    return;
  }

  if (Session.get('curateMode')) {
    Session.set('saveState', 'saving');

    Meteor.setTimeout(function () { // scroll to top and focus annotation box
      $('.context-browser>.context-area').scrollTop(0);
      $('.context-section[data-context-id=' + contextBlock._id + '] textarea').focus();
    });

    Meteor.call('addContextToStream', Session.get("streamShortId"), contextBlock, function (err, contextId) {
      saveCallback(err, contextId);
    });
  } else { // suggest content
    Meteor.call('suggestContext', Session.get("streamShortId"), contextBlock, function (err, contextId) {
      saveCallback(err, contextId);
    });
  }
};



Template.link_twitter.events({
  "click button" () {
    if (!Meteor.user()){
      notifyInfo('Please log in to link your twitter account');
      return
    }

    Meteor.linkWithTwitter({
      requestPermissions: ['user']
    }, function (err) {
      if (err) {
        notifyError("Twitter login failed");
        throw(err);
      } else if (!Meteor.user().profile.bio){
        Meteor.call('setBioFromTwitter')
      }
    });
    analytics.track('Click Link Twitter');
  }
});


Template.unimplemented_chat_section.onCreated(function(){
  notifyFeature('Chat: coming soon!');
});
