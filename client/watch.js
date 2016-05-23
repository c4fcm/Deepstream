var ytScriptLoaded = false;
var ytApiReady = new ReactiveVar(false);
var newContextDep = new Tracker.Dependency;
var embedEventsSet =false;

window.mainPlayer = {
  activated(){
    return this.activeStreamSource ? true : false;
  },
  play(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.playVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('play');
        break;
      case 'bambuser':
        this._bambuserPlayer.playBroadcast();
        break;
      case 'twitch':
        this._twitchPlayer.playVideo();
        break;
      case 'ml30':
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  pause(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.pauseVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('pause');
        break;
      case 'bambuser':
        this._bambuserPlayer.pauseBroadcast();
        break;
      case 'twitch':
        this._twitchPlayer.pauseVideo();
        break;
      case 'ml30':
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  stop(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.stopVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('stop');
        break;
      case 'bambuser':
        this._bambuserPlayer.pauseBroadcast();
        break;
      case 'twitch':
        this._twitchPlayer.pauseVideo();
        break;
      case 'ml30':
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  mute(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.mute();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('volume', 0);
        break;
      case 'bambuser':
        this._bambuserPlayer.mute();
        break;
      case 'twitch':
        this._twitchPlayer.mute();
        break;
      case 'ml30':
        document.getElementById(Session.get('mainStreamIFrameId')).contentWindow.postMessage('mute', 'https://civic.mit.edu');
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  unmute(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.unMute();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('volume', 70); // TO-DO return volume to wherever they were before mute
        break;
      case 'bambuser':
        this._bambuserPlayer.unmute();
        break;
      case 'twitch':
        this._twitchPlayer.unmute();
        break;
      case 'ml30':
        document.getElementById(Session.get('mainStreamIFrameId')).contentWindow.postMessage('unmute', 'https://civic.mit.edu');
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  lowerVolume(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.setVolume(15);
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('volume', 15);
        break;
      case 'bambuser':
        this._bambuserPlayer.mute();
        break;
      case 'twitch':
        this._twitchPlayer.mute();
        break;
      case 'ml30':
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  isMuted(){
    switch(this.activeStreamSource){
      case 'youtube':
        return this._youTubePlayer.isMuted();
      //case 'ustream':
      //  return
      //case 'bambuser':
      //  return
      //case 'twitch':
      //  return
      default:
        return false
    }
  },
  getElapsedTime(){
    switch(this.activeStreamSource){
      case 'youtube':
        if(this._youTubePlayer.getCurrentTime){
          return this._youTubePlayer.getCurrentTime();
        } else {
          return 0;
        }
      //case 'ustream':
      //  return
      //case 'bambuser':
      //  return
      //case 'twitch':
      //  return
      default:
        return false
    }
  },
  activeStream: new ReactiveVar({})
};

Template.watch_page.onCreated(function () {
  if(!ytScriptLoaded){
    $.getScript('https://www.youtube.com/iframe_api', function () {});
    ytScriptLoaded = true;
  }
  
  Session.set('replayContext', false);

  this.mainStreamIFrameId = Random.id(8);
  Session.set('mainStreamIFrameId', this.mainStreamIFrameId);
  this.mainStreamFlashPlayerId = Random.id(8);



  var that = this;

  this.settingsMenuOpen = new ReactiveVar();


  window.onYouTubeIframeAPIReady = function() {
    ytApiReady.set(true);
  };

  window.bambuserPlayerReady = function(){
    console.log('Bambuser player ready');
    mainPlayer._bambuserPlayer = getFlashMovie(that.mainStreamFlashPlayerId);
  };


  window.bambuserCuratorWebcamPlayerReady = function(){
    console.log('Bambuser curator webcam player ready');
    $('.curator-webcam-stream-container').addClass('ready'); // TO-DO use reactive / session vars
  };

  window.twitchPlayerEventCallback = function(events){
    if(_.findWhere(events, {event: 'playerInit'})){
      console.log('Twitch player ready');
      mainPlayer._twitchPlayer = getFlashMovie(that.mainStreamFlashPlayerId);
    }
  };

  

  // confirm stream exists confirm user is curator if on curate page. forward curators to curate if they are on watch page
  this.autorun(function(){
    if(FlowRouter.subsReady()){
      var stream = Deepstreams.findOne({shortId: that.data.shortId()}, {reactive: false});
      var user = Meteor.user();
      if(!stream){
        setStatusCode(404);
        return BlazeLayout.render("stream_not_found");
      }

      setTitle(stream.title);
      setMetaDescription(stream.description);
      setStatusCode();

      if (that.data.onCuratePage()){
        if ((user = Meteor.user())) { // if there is a user
          if (!_.contains(stream.curatorIds, user._id)) { // if they don't own the stream take them to stream not found
            setStatusCode(404);
            return BlazeLayout.render("stream_not_found");
          }
          var accessPriority = Meteor.user().accessPriority;
          if (!accessPriority || accessPriority > window.createAccessLevel){
            FlowRouter.withReplaceState(function(){
              FlowRouter.go(stream.watchPath());
            });
            notifyInfo("Creating and editing streams is temporarily disabled, possibly because things blew up (in a good way). Sorry about that! We'll have everything back up as soon as we can. Until then, why not check out some of the other great content authors in the community have written?")
          }
        } else if (Meteor.loggingIn()) {
          return
        } else { // if there is no user
          FlowRouter.withReplaceState(function(){
            FlowRouter.go(stream.watchPath());
          });
        }
      } else if (user && _.contains(stream.curatorIds, user._id) && (!embedMode())){
        FlowRouter.withReplaceState(function(){
          FlowRouter.go(stream.curatePath());
        });
      }

    }
  });

  this.autorun(function(){
    Session.set("streamShortId", that.data.shortId());
  });

  Session.set('contextMode', 'context');
  Session.set('showManageCuratorsMenu', false);

  // march through creation steps, or setup most recent context type to display when arrive on page if past curation
  this.autorun(function(){
    if(FlowRouter.subsReady()){
      var reactiveDeepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {fields: {creationStep: 1}});

      if(that.data.onCuratePage()){
        if (_.contains(['find_stream'], reactiveDeepstream.creationStep)){
          Session.set("mediaDataType", 'stream');
          return
        } else if (reactiveDeepstream.creationStep === 'add_cards') {
          Session.set("mediaDataType", 'image');
          return
        }
      }
    }
  });


  // for viewers, to keep track of when new context has been added
  var numContextBlocks;
  Session.set('newContextAvailable', false);

  this.autorun(function(){
    if(FlowRouter.subsReady()){
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {fields: {contextBlocks: 1}});
      if(!deepstream){
        return;
      }
      var newNumContextBlocks = deepstream.contextBlocks.length;
      if(typeof numContextBlocks === 'number'){
        if(newNumContextBlocks > numContextBlocks){
          if(!that.data.onCuratePage()){
            Session.set('newContextAvailable', true);
          }
        }
      }
      numContextBlocks = newNumContextBlocks;
    }
  });

  // for adding curators who have arrived via an invite to curator
  this.autorun(function(){
    var inviteCode, user;
    if(inviteCode = that.data.curatorInviteCode()){
      if(FlowRouter.subsReady()){
        if(user = Meteor.user()){
          var deepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {reactive: false});
          if(_.contains(deepstream.curatorIds, user._id)){ // if this user is already a curator
            delete that.data.curatorSignupCode;
            return
          }
          Meteor.call('becomeCurator', that.data.shortId(), inviteCode, function(err, success){
            if(err){
              notifyError(err);
            }
            if(success){
              notifySuccess("You are now curating this DeepStream. Have fun and don't let the power go to your head!");
              delete that.data.curatorSignupCode;
              analytics.track('Additional curator added', trackingInfoFromPage());
              FlowRouter.withReplaceState(function(){
                FlowRouter.go(deepstream.curatePath());
              });
            }
          });
        } else {
          Session.set('signingIn', true);
        }
      }
    }

  });

  this.activeStream = new ReactiveVar();
  this.userControlledActiveStreamId = new ReactiveVar();

  // switch between streams
  this.autorun(function(){ // TO-DO Performance, don't rerun on every stream switch, only get fields needed
    if (FlowRouter.subsReady()) {
      var userControlledActiveStreamId = that.userControlledActiveStreamId.get();
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()});
      var newActiveStream;

      if (!Session.get('curateMode') && userControlledActiveStreamId && deepstream.userStreamSwitchAllowed()) {
        newActiveStream = deepstream.getStream(userControlledActiveStreamId);
      } else {
        newActiveStream = deepstream.activeStream();
      }

      // hack to remove and reinsert active main stream when the same service is used in old stream and new stream
      var activeStream;
      Tracker.nonreactive(function(){
        activeStream = that.activeStream.get();
      });
      if(activeStream && newActiveStream && activeStream.source === newActiveStream.source && activeStream._id !== newActiveStream._id){
        Session.set('removeMainStream', true);
        Meteor.setTimeout(() => Session.set('removeMainStream', false), 0);
      }
      
      that.activeStream.set(newActiveStream);
    }
  });


  var shortId = this.data.shortId();

  if (Session.get('deepstreamViewed') !== shortId) {
    Session.set('deepstreamViewed', shortId);
    if(embedMode()){ // in embed mode, wait for a scroll before counting a view
      $(window).one('mousemove', function(){
        Meteor.call('countDeepstreamView', shortId);
      });
    } else {
      Meteor.call('countDeepstreamView', shortId);
    }
    analytics.track('View stream', {
      label: shortId,
      onCuratePage: this.data.onCuratePage(),
      userPathSegment: this.data.userPathSegment(),
      streamPathSegment: this.data.streamPathSegment(),
      nonInteraction: 1
    });
  }
});


Template.watch_page.onRendered(function(){
  var that = this;

  this.mainPlayerYTApiActivated = false;
  this.mainPlayerUSApiActivated = false;

  this.checkTime = setInterval(() => {
    if(mainPlayer && mainPlayer.getElapsedTime){
      Session.set('currentTimeElapsed', mainPlayer.getElapsedTime());
    }
  }, 4000);

  // activate jsAPIs for main stream
  this.autorun(function(){
    if(ytApiReady.get() && FlowRouter.subsReady()){
      var activeStream = that.activeStream.get();
      mainPlayer.activeStream.set(that.activeStream.get());
      if(!activeStream){
        return
      }
      switch(activeStream.source){
        case 'youtube':
          if ( !this.mainPlayerYTApiActivated ){
            console.log('activate the yt api!!')
            this.mainPlayerYTApiActivated = true;
            Meteor.setTimeout(function(){ // TODO this is a hack. Why does it need to wait?
              var youTubePlayer = new YT.Player(that.mainStreamIFrameId, {
                events: {
                  'onReady': onMainPlayerReady,
                  'onStateChange': onMainPlayerStateChange
                }
              });
              mainPlayer._youTubePlayer = youTubePlayer;
              mainPlayer.activeStreamSource = 'youtube';
            }, 1000);
          } else {
            mainPlayer.activeStreamSource = 'youtube';
          }
          break;
        case 'ustream':
          if ( !this.mainPlayerUSApiActivated ){
            console.log('activate the ustream api!!')
            this.mainPlayerUSApiActivated = true;
            Meteor.setTimeout(function(){ // TODO this is a hack. Why does it need to wait?
              var ustreamPlayer = UstreamEmbed(that.mainStreamIFrameId);
              mainPlayer._ustreamPlayer = ustreamPlayer;
              mainPlayer.activeStreamSource = 'ustream';
            }, 1000);
          } else {
            mainPlayer.activeStreamSource = 'ustream';
          }
          Meteor.setTimeout(onMainPlayerReady, 4000); // TODO, this is a hack. Is there any way to know that the player is ready?
          break;
        case 'bambuser':
          mainPlayer.activeStreamSource = 'bambuser';
          break;
        case 'twitch':
          mainPlayer.activeStreamSource = 'twitch';
          break;
        case 'ml30':
          mainPlayer.activeStreamSource = 'ml30';
          break;
      }

    }
  });

  // focus on title when title/description overlay appears
  this.autorun(function(){
    if(FlowRouter.subsReady()) {
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {fields: {creationStep: 1}});
      if (deepstream.creationStep === 'title_description') {
        Meteor.setTimeout(function() { // TODO this is a hack.
          that.$('input[name=title]')[0].focus();
        }, 100);
      }
    }
  });

  this.autorun(function(){
    let context;
    if(context = getCurrentContext()){
      Session.set('activeContextId', context._id);
    }
  });
  
  this.autorun(function(){
    if(FlowRouter.subsReady()) {
      Meteor.setTimeout(function() { // TODO this is a hack.
    
        // don't set multiple times and on playerStateChange shouldn't be the trigger.

        // create embed-code
        var deepstreamEmbedUrl = decodeURIComponent(encodeURIComponent(location.href).replace(/%2Fcurate%2F/, "%2Fembed%2F").replace(/%2Fwatch%2F/, "%2Fembed%2F"));
        $(".embed-code-button").attr("data-clipboard-text", '<div style="position: relative; padding-bottom: 56.25%; padding-top: 25px; height: 0;"> <iframe src="' + deepstreamEmbedUrl + '" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>');

        // set up embed-code-button in footer
        embedClipboard = new Clipboard('.embed-code-button');
        
        if(!embedEventsSet){
          embedClipboard.on('success', function(e) {
            notifyInfo('Embed code copied to clipboard!')
            e.clearSelection();
          });

          embedClipboard.on('error', function(e) {
            // Simplistic detection
            var action = e.action;
            var actionMsg = '';
            var actionKey = (action === 'cut' ? 'X' : 'C');

            if(/iPhone|iPad/i.test(navigator.userAgent)) {
              var embedCode = $('.embed-code-button').attr('clipboard-text');
              actionMsg = 'Here is your embed code: ' + embedCode;
            }
            else if (/Mac/i.test(navigator.userAgent)) {
              actionMsg = 'Press ⌘-' + actionKey + ' to ' + action;
            }
            else {
              actionMsg = 'Press Ctrl-' + actionKey + ' to ' + action;
            }
            notifyInfo(actionMsg);
          });
          embedEventsSet = true;
        }

      }, 100);
      
    }
  });
  
  onMainPlayerReady = function(event){
    //mainPlayer.play(); // if streamUrl uses autoplayUrl, this is effectively a fallback
  };

  onMainPlayerStateChange = function(event){
    //console.log('PlayerStateChange');
    //console.log(event);
  }
  
  // show title at start then fade out after 4 seconds if not in curateMode
  if(!Session.get('curateMode')){
    $('.title-section').fadeTo(400, 1, function(){
      Meteor.setTimeout(function(){
        $('.title-section').fadeTo(400, 0);
        $('.trigger-title').fadeTo(400, 1);
      },4000);

    });
    $('.trigger-title').fadeTo(100, 0);
  }
  
});

Template.watch_page.onDestroyed(function () {
  if(mainPlayer){
    mainPlayer.activeStreamSource = null;
  }
  Session.set('replayContext', false)
  Meteor.clearInterval(this.checkTime);
});


var titleMax = 60;
var descriptionMax = 270;


Template.watch_page.helpers({
  activeStream (){
    return Template.instance().activeStream.get();
  },
  active (){ // inside #each streams
    var activeStream = Template.instance().activeStream.get();
    if (activeStream){
      return this._id === activeStream._id;
    }
  },
  allowStreamPreview (){
    return true;
    //return Session.get('curateMode') && Deepstreams.findOne({shortId: Template.instance().data.shortId()}, {fields: {'directorMode': 1}}).directorMode
  },
  mainStreamIFrameId (){
    return Template.instance().mainStreamIFrameId;
  },
  mainStreamFlashPlayerId (){
    return Template.instance().mainStreamFlashPlayerId;
  },
  mainStreamInIFrame (){
    return _.contains(['ustream', 'youtube', 'ml30'], Template.instance().activeStream.get().source);
  },
  mainStreamInFlashPlayer (){
    return _.contains(['bambuser', 'twitch'], Template.instance().activeStream.get().source);
  },
  onCuratePage (){
    return Template.instance().data.onCuratePage ? Template.instance().data.onCuratePage() : null;
  },
  thisDeepstream () {
    if (FlowRouter.subsReady()) {
      return Deepstreams.findOne({shortId: Template.instance().data.shortId()});
    }
  },
  deepstreamForContext () {
    newContextDep.depend();
    if (FlowRouter.subsReady()) {
      return Deepstreams.findOne({shortId: Template.instance().data.shortId()}, {reactive: Template.instance().data.onCuratePage()});
    }
  },
  showContextBrowser (){
    return Session.equals('contextMode', 'context');
  },
  streamUrl (){
    var activeStream = Template.instance().activeStream.get();
    if(activeStream){
      return activeStream.autoplayUrl();
    }
  },
  mainStreamFlashVars (){
    var activeStream = Template.instance().activeStream.get();
    var addlParams;

    switch(activeStream.source){
      case 'bambuser':
        addlParams='&callback=bambuserPlayerReady';
        break;
      case 'twitch':
        addlParams='&eventsCallback=twitchPlayerEventCallback';
        break;
    }
    if(activeStream){
      return activeStream.flashVars() + addlParams;
    }
  },
  bambuserPlayer (){
    return Template.instance().activeStream.get().source === 'bambuser'
  },
  twitchPlayer (){
    return Template.instance().activeStream.get().source === 'twitch'
  },
  removeMainStream (){
    return Session.get('removeMainStream');
  },
  showTitleDescriptionEditOverlay (){
    return this.creationStep == 'title_description';
  },
  showTutorial (){
    return _.contains(['find_stream', 'add_cards', 'go_on_air'], this.creationStep) && Session.get('curateMode');
  },
  showRightSection (){
    return !soloOverlayContextModeActive() && !Session.get('reducedRightView');
  },
  showBottomSection (){
    return !soloOverlayContextModeActive() && !Session.get('reducedBottomView');
  },
  expandMainSection (){
    return !Session.get("curateMode") && Session.get('reducedRightView');
  },
  showWebcamSetup (){
    return Session.get("curateMode") && Session.get('mediaDataType') === 'webcam'; // always setup on webcam
  },
  showManageCuratorsMenu (){
    return Session.get("curateMode") && Session.get("showManageCuratorsMenu");
  },
  showChat (){
    return Session.get('showChat', true); // TODO this is probably not what we want
  },
  showContextSearch (){
    return Session.get('mediaDataType') && Session.get('mediaDataType') !=='webcam';
  },
  showPreviewEditButton (){
    return !this.creationStep || this.creationStep === 'go_on_air';
  },
  soloOverlayContextMode (){
    return soloOverlayContextModeActive();
  },
  PiP (){
    return soloOverlayContextModeActive();
  },
  streamTitleElement (){
    if (Session.get('curateMode')) {
      // this is contenteditable in curate mode
      return '<div class="stream-title notranslate" placeholder="Title" contenteditable="true" dir="auto">' + _.escape(this.title) + '</div>';
    } else {
      return '<div class="stream-title">' + _.escape(this.title) + '</div>';
    }
  },
  streamDescriptionElement (){
    if (Session.get('curateMode')) {
      // this is contenteditable in curate mode
      return '<div class="stream-description notranslate" placeholder="Enter a description" contenteditable="true" dir="auto">' + _.escape(this.description) + '</div>';
    } else {
      return '<div class="stream-description">' + _.escape(this.description) + '</div>';
    }
  },
  showStreamSwitcher (){
    return Session.get('curateMode') || this.userStreamSwitchAllowed();
  },

  settingsMenuOpen (){
    return Template.instance().settingsMenuOpen.get();
  },
  livestreams (){
    return _.where(this.streams, { live: true });
  },
  deadstreams (){
    return _.where(this.streams, { live: false });
  },
  showCloseSidebarIcon (){
    return !Session.get('reducedRightView') && !soloOverlayContextModeActive();
  },
  showOpenSidebarIcon (){
    return Session.get('reducedRightView') && !soloOverlayContextModeActive();
  },
  showCloseBottombarIcon (){
    return !Session.get('reducedBottomView') && !soloOverlayContextModeActive();
  },
  showOpenBottombarIcon (){
    return Session.get('reducedBottomView') && !soloOverlayContextModeActive();
  },
  showHighlightContext(){
    if(Session.get('shownHighlightContext')){
      return !Session.get('shownHighlightContext') && !soloOverlayContextModeActive(); 
    } else {
      return !document.cookie.match('shownHighlightContext=') && !soloOverlayContextModeActive();
    }
  }
});

var basicErrorHandler = function(err){
  if(err){
    notifyError(err);
    throw(err);
  }
};

var saveStreamTitle = function(template){
  streamTitle = $.trim(template.$('div.stream-title').text());
  Session.set('saveState', 'saving');
  return Meteor.call('updateStreamTitle', template.data.shortId(), streamTitle, basicErrorHandler);
};

Template.watch_page.events({
  'click #videoOverlay' (e,t){
    // now not in use
    $('.right-section.featured-context-container').fadeOut(1000, function(){
      Session.set('featuredPeek', false);
      Meteor.setTimeout(function(){
        $('.right-section').fadeIn(1000);
      },100);
    });
    analytics.track('Clicked featured homepage stream to expand', trackingInfoFromPage());
  },
  'click .set-main-stream' (e, t){
    if (Session.get('curateMode')) {
      Meteor.call('setActiveStream', t.data.shortId(), this._id, basicErrorHandler);
    } else {
      t.userControlledActiveStreamId.set(this._id);
    }
    analytics.track('Click mini-stream to set main stream', trackingInfoFromPage());
  },
  'click .delete-stream' (e, t){
    var streamElement = t.$('[data-stream-id=' + this._id + ']');
    streamElement.addClass('to-delete');
    if (confirm('Are you sure you want to delete this stream?')) {
      streamElement.fadeOut(500, () => {
        Meteor.call('removeStreamFromStream', Session.get("streamShortId"), this._id, basicErrorHandler);
      });
    } else {
      streamElement.removeClass('to-delete');
    }
  },
  'mouseleave .second-row' (e, t){
    if(!Session.get("curateMode")){
      $('.title-section').fadeTo(400, 0);
      $('.trigger-title').fadeTo(400, 1);
    }
  },
  'mouseenter .trigger-title' (e, t){
    $('.title-section').fadeTo(400, 1);
    $('.trigger-title').fadeTo(400, 0);
  },
  'click .preview' (e, t){
    t.userControlledActiveStreamId.set(null); // so that stream selection doesn't switch
    // now lets go back to the curate menu
    Session.set('previousMediaDataType', Session.get('mediaDataType'));
    Session.set('mediaDataType', null);
    Session.set('curateMode', false);
  },
  'click .return-to-curate' (){
    Session.set('curateMode', true);
  },
  'click .suggest-content' (){
    Session.set('mediaDataType', Session.get('previousMediaDataType') || 'image');
  },
  'click .got-it-context' (){
    Session.set('shownHighlightContext', true); 
    // set session for update now, and cookie for persistance
    document.cookie = "shownHighlightContext=true; expires=Fri, 31 Dec 9999 23:59:59 GMT";
    analytics.track('Click got it button for context', trackingInfoFromPage());
  },
  'click .publish' (e, t){
    if (this.creationStep === 'go_on_air') {
      if (!this.streams.length) {
        notifyError('Please add a stream before you publish your deepstream');
        Meteor.call('goToFindStreamStep', t.data.shortId(), basicErrorHandler);
      } else {
        Meteor.call('proceedFromGoOnAirStep', t.data.shortId(), basicErrorHandler);
      }
    } else if (!this.creationStep) {
      Meteor.call('publishStream', t.data.shortId(), function (err) {
        if (err) {
          basicErrorHandler(err);
        } else {
          notifySuccess("Congratulations! Your Deep Stream is now on air!");
        }
      });
    }
  },
  'click .unpublish' (e, t){
    Meteor.call('unpublishStream', t.data.shortId(), basicErrorHandler);
  },
  'click .show-stream-search' (e, t){
    if (this.creationStep && this.creationStep !== 'go_on_air') {
      Meteor.call('goToFindStreamStep', t.data.shortId(), basicErrorHandler);
    } else {
      Session.set('mediaDataType', 'stream');
    }
  },
  'blur .stream-title[contenteditable]' (e, template) {
    saveStreamTitle(template);
  },
  'keypress .stream-title[contenteditable]' (e, template) {
    if (e.keyCode === 13) { // return
      e.preventDefault();
      saveStreamTitle(template);
    }
  },
  'paste [contenteditable]': window.plainTextPaste,
  'drop [contenteditable]' (e){
    e.preventDefault();
    return false;
  },
  'blur .stream-description[contenteditable]' (e, template) {
    streamDescription = $.trim(template.$('div.stream-description').text());
    Session.set('saveState', 'saving');
    return Meteor.call('updateStreamDescription', template.data.shortId(), streamDescription, basicErrorHandler);
  },
  'click .director-mode-off' (e, t){
    return Meteor.call('directorModeOff', t.data.shortId(), basicErrorHandler)
  },
  'click .director-mode-on' (e, t){
    return Meteor.call('directorModeOn', t.data.shortId(), basicErrorHandler)
  },
  'click .show-manage-curators-menu' (e, t){
    Session.set('previousMediaDataType', Session.get('mediaDataType'));
    Session.set('mediaDataType', null);
    return Session.set("showManageCuratorsMenu", true);
  },
  'mouseenter .settings-menu-button' (e, template){
    template.settingsMenuOpen.set(true);
  },
  'mouseleave .settings-menu' (e, template){
    template.settingsMenuOpen.set(false);
  },
  'click .microphone' (e, t){
    notifyFeature('Live audio broadcast: coming soon!');
  },
  'click .webcam' (e, t){
    Session.set('mediaDataType', 'webcam');
  },
  'click .end-curator-webcam-stream' (e, t){
    Meteor.call('stopCuratorWebcam', t.data.shortId(), basicErrorHandler);
  },
  'click .email-share-button' (e, t){
    var width = 575;
    var height = 400;
    var left = ($(window).width() - width) / 2;
    var top = ($(window).height() - height) / 2;
    var deepstreamUrl = encodeURIComponent(location.href).replace(/%2Fcurate%2F/, "%2Fwatch%2F");
    var url = 'mailto:?subject=Check out '+ this.title + ' On DeepStream&body=' + deepstreamUrl;
    var opts = 'status=1' +
      ',width=' + width +
      ',height=' + height +
      ',top=' + top +
      ',left=' + left;
    window.open(url, 'facebook', opts);
    Meteor.call('countDeepstreamShare', this.shortId, 'email');
    analytics.track('Click email share', trackingInfoFromPage());
  },
  'click .twitter-share-button' (e, t){
    var width = 575;
    var height = 400;
    var left = ($(window).width() - width) / 2;
    var top = ($(window).height() - height) / 2;
    var url = '//twitter.com/intent/tweet?text=Check out "' + encodeURIComponent(this.title) + '" on DeepStream&url=' + encodeURIComponent(location.href).replace(/%2Fcurate%2F/, "%2Fwatch%2F");
    var opts = 'status=1' +
      ',width=' + width +
      ',height=' + height +
      ',top=' + top +
      ',left=' + left;
    window.open(url, 'twitter', opts);
    Meteor.call('countDeepstreamShare', this.shortId, 'twitter');
    analytics.track('Click twitter share', trackingInfoFromPage());
  },
  'click .facebook-share-button' (e, t){
    var width = 575;
    var height = 400;
    var left = ($(window).width() - width) / 2;
    var top = ($(window).height() - height) / 2;
    var url = "//facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href).replace(/%2Fcurate%2F/, "%2Fwatch%2F");
    var opts = 'status=1' +
      ',width=' + width +
      ',height=' + height +
      ',top=' + top +
      ',left=' + left;
    window.open(url, 'facebook', opts);
    Meteor.call('countDeepstreamShare', this.shortId, 'facebook');
    analytics.track('Click facebook share', trackingInfoFromPage());
  },
  'click .PiP-overlay' (e, t){
    clearCurrentContext();
  },
  'click .context-mini-preview' (e, t){
    scrollToContext(this._id);
    analytics.track('Click context mini preview', trackingInfoFromContext(this));
  },
  'click .curator-card-like' (e, t){
    analytics.track('Click curator card like', trackingInfoFromPage());
  },
  'click .curator-card-create' (e, t){
    analytics.track('Click curator card create', trackingInfoFromPage());
  },
  'click .curator-card-replay' (e, t){
    if(Session.get("replayContext")){
      Session.set("replayContext", false);
    } else {
      Session.set("replayContext", true);
    }
    analytics.track('Click curator card replay context', trackingInfoFromPage());
  },
  'click .about-deepstream-embed, click .deepstream-logo-embed' (e, t){
    Session.set('showDeepstreamAboutOverlay', true);
  },
  'click .close-deepstream-about-overlay' (e, t){
    Session.set('showDeepstreamAboutOverlay', false);
  },
  'click .update-with-new-context' (e, t){
    Session.set('newContextAvailable', false);
    newContextDep.changed();
    var mostRecentContextId = Deepstreams.findOne({shortId: Template.instance().data.shortId()}).mostRecentContextId();
    if(mostRecentContextId){
      scrollToContext(mostRecentContextId);
    }
  },
  'click .close-sidebar' (){
    return Session.set('reducedRightView', true);
  },
  'click .open-sidebar' (){
    return Session.set('reducedRightView', false);
  },
  'click .close-bottombar' (){
    return Session.set('reducedBottomView', true);
  },
  'click .open-bottombar' (){
    return Session.set('reducedBottomView', false);
  },
});

Template.stream_li.onCreated(function(){
  this.previewMode = new ReactiveVar();
});

Template.stream_li.helpers({
  active (){
    return Template.instance().data.active;
  },
  previewMode (){
    return Template.instance().previewMode.get();
  },
  showPreviewButton (){
    return Template.instance().data.allowPreview;
  },
  disablePreviewButton (){
    return this.source === 'twitch' || this.source === 'ml30';
  }
});

Template.stream_li.events({
  'click .preview-stream' (e, t){
    analytics.track('Click preview mini-stream', trackingInfoFromPage());
    return t.previewMode.set(true);
  }
});

Template.context_browser_area.helpers({
  orderedContext (){
    return this.orderedContext(Session.get("replayContext"))
  },
  showShowSuggestionsButton (){
    return Session.get('curateMode') && this.hasPendingSuggestions();
  },
  showShowTimelineButton (){
    return Session.get('curateMode') || Deepstreams.findOne({shortId: Session.get('streamShortId')}, {fields: {twitterTimelineId: 1}}).twitterTimelineId;
  },
  showSuggestions (){
    return Session.equals('contextMode', 'suggestions');
  },
  showTimeline (){
    return Session.equals('contextMode', 'timeline');
  },
  showContextBrowser (){
    return Session.equals('contextMode', 'context');
  }
});

Template.context_browser_area.events({
  'click .show-timeline'(){
    analytics.track('Click show timeline', trackingInfoFromPage());
    Session.set('contextMode', 'timeline');
    Session.set('activeContextId', null);
  },
  'click .show-context-browser'(){
    analytics.track('Click show context browser', trackingInfoFromPage());
    Session.set('contextMode', 'context');
    setTimeout(() => { // need to wait till display has switched back to context
      updateActiveContext();
    })
  },
  'click .show-suggestions'(){
    analytics.track('Click show suggestions browser', trackingInfoFromPage());
    Session.set('contextMode', 'suggestions');
    Session.set('activeContextId', null);
  }
});

Template.context_card_column.helpers({
  isActiveContext (){
    return Session.equals('activeContextId', this._id);
  }
});

Template.context_card_column.onRendered(function(){
  // make context sortable
  var sortableSets = [
    {
      outerDiv: '.context-browser>.context-area',
      listItem: '.list-item-context-plus-annotation'
    },{
      outerDiv: '.previews-container',
      listItem: '.context-mini-preview'
    }
  ];
  
  _.each(sortableSets, (sortableSet) => {
    let sortableOuterDiv = sortableSet.outerDiv;
    let sortableListItem = sortableSet.listItem;

    this.$(sortableOuterDiv).sortable({
      items: sortableListItem,
      stop: () => {
        var newOrder = this.$(sortableOuterDiv).sortable('toArray', {attribute: 'data-context-id'});
        Meteor.call('reorderContext', Session.get('streamShortId'), newOrder, saveCallback);
      }
    });
    this.$(sortableOuterDiv).disableSelection();

    Tracker.autorun(() => {
      if(Session.get('curateMode')){
        this.$(sortableOuterDiv).sortable('enable');
      } else {
        this.$(sortableOuterDiv).sortable('disable');
      }
    })
  });
});


Template.context_browser.onRendered(function() {
  Tracker.autorun(() => {
    this.data.contextBlocks;
    updateActiveContext();
  });
});

Template.context_browser.helpers({
  mediaTypeForDisplay (){
    return pluralizeMediaType(Session.get('mediaDataType') || Session.get('previousMediaDataType')).toUpperCase();
  },
  replayAvailable(){
    console.log(mainPlayer.activeStream.get());
    
    if(mainPlayer.activeStream.get().source === "youtube" && !mainPlayer.activeStream.get().live){
      return true;
    } else {
      return false;
    }
  },
  replayContextOn(){
    if(Session.get("replayContext")){
      return true;
    } else {
      return false;
    }
  },
  soloSidebarContextMode (){
    var currentContext = getCurrentContext();
    return currentContext && currentContext.soloModeLocation === 'sidebar';
  },
  userFavorited () {
    console.log(_.contains(Meteor.user().profile.favorites, this.shortId));
    return Meteor.user() && _.contains(Meteor.user().profile.favorites, this.shortId);
  },
  curatorNames () {
    var curatorIds = Deepstreams.findOne({shortId: Session.get('streamShortId')}, {fields: {curatorIds: 1}}).curatorIds;
    if(curatorIds.length < 2){
      return this.curatorName;
    }
    Meteor.call('returnCuratorNames', curatorIds, function(error, results){
      var nameList = results;
      var curatorNames = '';
      nameList.forEach(function(value, index, array){
        if(value !== undefined){
          if(index === (array.length-2)){
            curatorNames += value + ' and '
          } else if(index === (array.length-1)){
            curatorNames += value + '.'
          } else {
            curatorNames += value + ', '
          }
        }
      });
      Session.set('curatorNames', curatorNames);
    });
    return Session.get('curatorNames');
  }
});

Template.context_browser.events({
  'click .add-new-context-row' (){
    Session.set('mediaDataType', Session.get('previousMediaDataType') || 'image');
  },
  'click .delete-context' (e, t){
    if(confirm('Are you sure you want to delete this ' + singularizeMediaType(this.type) + '? This cannot be undone.')){
      t.$('.list-item-context-plus-annotation[data-context-id=' + this._id + ']').fadeOut(500, () => {
          Meteor.call('removeContextFromStream', Session.get("streamShortId"), this._id, basicErrorHandler);
      });
    }
  },
  'click .list-item-context-section' (e, t) {
    analytics.track('Click context section in list mode', trackingInfoFromContext(this));
  },
  'click .approve-suggestion' (e, t) {
    analytics.track('Click approve suggestion', trackingInfoFromContext(this));
    Meteor.call('approveContext', this._id, function(err, success){
      if(t.data.contextBlocks.count() === 0){ // if this was the last suggestion
        Session.set('contextMode', 'context');
      }
      return basicErrorHandler(err, success)
    });
  },
  'click .reject-suggestion' (e, t) {
    analytics.track('Click reject suggestion', trackingInfoFromContext(this));
    t.$('.list-item-context-plus-annotation[data-context-id=' + this._id + ']').fadeOut(500, () => {
      Meteor.call('rejectContext', this._id, function(err, success){
        if(t.data.contextBlocks.count() === 0){ // if this was the last suggestion
          Session.set('contextMode', 'context');
        }
        return basicErrorHandler(err, success)
      });
    });
  },
  'click .context-section .clickable' (e, t){

    if ($(e.target).is('textarea')) { // don't go to big browser when its time to edit context
      return
    }

    if(this.hasSoloMode()){
      setCurrentContext(this);
    }
  },
  'click .switch-to-list-mode' (){
    clearCurrentContext();
  },
  'scroll .context-browser>.context-area.list-mode': updateActiveContext
});

Template.overlay_context_browser.onRendered(function(){
  document.body.style.overflow = 'hidden';
  $(window).scrollTop(0);

  if (Session.get('mediaDataType') === 'video') {
    Meteor.setTimeout(function () { // mute stream if playing a video
      mainPlayer.mute();
    }, 1000); // TODO Hack, if mute main video before youtube video loads, will play as muted. Need to mute as soon as loaded
  }

});

Template.overlay_context_browser.onDestroyed(function(){
  document.body.style.overflow = 'auto';
  if(Session.get('mediaDataType') === 'video'){
    mainPlayer.unmute(); // TODO - only unmute if was unmuted before created
  }
});

Template.overlay_context_browser.events({
  'click .close' (){
    clearCurrentContext();
  }
});

Template.solo_context_section.events({
  'click .close' (){
    clearCurrentContext();
  }
});

Template.solo_context_section.helpers(horizontalBlockHelpers);
Template.solo_context_section.helpers({
  showProvider (){
    return this.soloModeLocation === 'overlay';
  }
});
Template.list_item_context_section.helpers(horizontalBlockHelpers);
Template.list_item_context_section.helpers({
  showContext(){
    if(Session.get("replayContext") === true){
      if(Session.get("curateMode") === true){
        return true;
      }
      if(!this.videoMarker){
        return true;
      }
      if(!Session.get("currentTimeElapsed")){
        return false;
      }
      if(parseFloat(Session.get("currentTimeElapsed")) < parseFloat(this.videoMarker)){
        return false;
      }
      return true;
    } else {
      return true;
    }
  },
});

Template.title_description_overlay.onCreated(function(){
  this.titleLength = new ReactiveVar(this.title ? this.title.length : 0);
  this.descriptionLength = new ReactiveVar(this.description ? this.description.length : 0);
});

Template.title_description_overlay.helpers({
  titleLength (){
    return  Template.instance().titleLength.get();
  },
  titleMax (){
    return titleMax;
  },
  descriptionLength (){
    return Template.instance().descriptionLength.get();
  },
  descriptionMax (){
    return descriptionMax;
  }
});

Template.title_description_overlay.events({
  'keypress .set-title' (e, t){
    if (e.keyCode === 13){
      e.preventDefault();
      $('.set-description').focus();
    }
  },
  'keypress .set-description' (e, t){
    if (e.keyCode === 13){
      e.preventDefault();
      $('#publish-with-title-description').submit();
    }
  },
  'keyup .set-title' (e, t){
    t.titleLength.set($(e.currentTarget).val().length);
  },
  'keyup .set-description' (e, t){
    t.descriptionLength.set($(e.currentTarget).val().length);
  },
  'submit #publish-with-title-description' (e, t){
    e.preventDefault();
    var title = t.$('.set-title').val();
    var description = t.$('.set-description').val();
    Meteor.call('publishStream', this.shortId, title, description, function(err){
      if(err){
        basicErrorHandler(err);
      } else {
        notifySuccess("Congratulations! Your Deep Stream is now on air!");
      }
    });
  },
  'click .close' (e, t){
    Meteor.call('goBackFromTitleDescriptionStep', this.shortId, basicErrorHandler);
  }
});

Template.creation_tutorial.helpers({
  onFindStreamStep (){
    return this.creationStep == 'find_stream';
  },
  onAddCardsStep (){
    return this.creationStep == 'add_cards';
  },
  onGoOnAirStep (){
    return this.creationStep == 'go_on_air';
  }
});

Template.creation_tutorial.events({
  'click .find-stream .text' (e, t){
    $('.header-section').css('z-index',1);
    Meteor.call('goToFindStreamStep', this.shortId, basicErrorHandler);
  },
  'click .add-cards .text' (e, t){
    $('.header-section').css('z-index',1);
    Meteor.call('goToAddCardsStep', this.shortId, basicErrorHandler);
  },
  'click .go-on-air .text' (e, t){
    $('.header-section').css('z-index',2);
    Meteor.call('goToPublishStreamStep', this.shortId, basicErrorHandler);
  },
  'click .find-stream button' (e, t){
    Meteor.call('skipFindStreamStep', this.shortId, basicErrorHandler);
  },
  'click .add-cards button' (e, t){
    Meteor.call('skipAddCardsStep', this.shortId, basicErrorHandler);
    console.log('clicked add cards');
    $('.header-section').css('z-index',2);
  },
  'click .title-description-overlay .close' (e, t){
    Meteor.call('goBackFromTitleDescriptionStep', this.shortId, basicErrorHandler);
  }
});

Template.relevant_content_icon.helpers({
  iconTemplate (){
    return this.type + '_icon';
  }
});

Template.annotation_section.helpers({
  annotation: textContentHelper
});

Template.webcam_setup.events({
  'submit #bambuser-webcam' (e, t){
    e.preventDefault();
    var bambuserUsername = t.$('input[name=bambuser-username]').val();
    if(!bambuserUsername){
      return notifyError('Please enter your Bambuser username')
    }
    Meteor.call('startCuratorWebcam', Session.get("streamShortId"), {source: 'bambuser', reference: {username: bambuserUsername}}, function(err, result){
      if(err){
        return basicErrorHandler(err);
      }
      notifySuccess('You are now narrating your DeepStream!');
    });
  }
});

Template.curator_webcam_display.helpers({
  curatorWebcamFlashVars (){

    switch(this.source){
      case 'bambuser':
        addlParams='&callback=bambuserCuratorWebcamPlayerReady';
        break;
      //case 'twitch':
      //  addlParams='&eventsCallback=twitchPlayerEventCallback';
      //  break;
    }
    return this.flashVars() + addlParams;
  }
})

Template.timeline_section.onRendered(function(){
  this.autorun(() => {
    if (FlowRouter.subsReady()) {
      var timelineId = Deepstreams.findOne({shortId: Session.get('streamShortId')}, {fields: {twitterTimelineId: 1}}).twitterTimelineId;
      this.$('#twitter-timeline iframe').remove();
      if(timelineId){
        twttr.ready((twttr) => {
          twttr.widgets.createTimeline(
            timelineId,
            this.$('#twitter-timeline')[0],
            {
              theme: 'dark',
              height: 'auto',
              width: 'auto'
            })
            .then(function (el) {
              console.log("Timeline has been displayed.")
            });
        });
      }
    }
  });
});


Template.timeline_section.events({
  'submit #timeline-embed' (e, t){
    e.preventDefault();
    var timelineWidgetCode = t.$('input[name=timeline-embed-code]').val();
    if(!timelineWidgetCode){
      return notifyError('Please enter your timeline widget code');
    }
    Meteor.call('addTimelineWidget', Session.get("streamShortId"), timelineWidgetCode, function(err, result){
      if(err){
        return basicErrorHandler(err);
      }
    });
  }
});

Template.manage_curators_menu.onCreated(function() {
  this.subscribe('minimalUsersPub', this.data.curatorIds);
});

Template.manage_curators_menu.helpers({
  'additionalCurators' (){
    return Meteor.users.find({_id: {$in: _.without(this.curatorIds, this.mainCuratorId)}});
  }
});

var disableInviteForm;

Template.manage_curators_menu.events({
  'click .go-back-button': function(){
    return Session.set('showManageCuratorsMenu', false);
  },
  'submit #invite-curator' (e, t){
    e.preventDefault();
    if(disableInviteForm){
      return
    }
    disableInviteForm = true;

    var newCuratorEmail = t.$('input[name=new-curator-email]').val();
    if(!newCuratorEmail){
      disableInviteForm = false;
      return notifyError('Please enter the email of the person you\'d like to invite');
    }
    Meteor.call('inviteCurator', Session.get("streamShortId"), newCuratorEmail, function(err, result){
      t.$('input[name=new-curator-email]').val('');
      disableInviteForm = false;
      if(err){
        return basicErrorHandler(err);
      }
      if(result){
        notifySuccess('You have successfully invited ' + newCuratorEmail + ' to help curate this DeepStream!');
        Session.set('showManageCuratorsMenu', false);
      }
    });
  },
  'click .remove-curator' (e, t){
    Meteor.call('removeCurator', Session.get("streamShortId"), this._id, function(err, result){

      if(err){
        return basicErrorHandler(err);
      }
    });
  }
});

var mutingTemplates = [
  'curator_webcam_display',
  'display_video_section'
];

_.each(mutingTemplates, function(templateName){
  // mute and unmute main video when show video overlay
  Template[templateName].onRendered(function(){
    // TO-DO check and store current mute status in case already muted
    if(mainPlayer && mainPlayer.activated()){
      if(mainPlayer.isMuted()){
        Session.set('previouslyMuted', true);
      } else {
        Session.set('previouslyMuted', false);
      }
      mainPlayer.mute();
    }
  });
  Template[templateName].onDestroyed(function(){
    if(mainPlayer && mainPlayer.activated()){
      if(!Session.get('previouslyMuted')){
        mainPlayer.unmute();
      }
    }
  });
});


