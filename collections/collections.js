var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };


SimpleSchema.debug = true; // TODO Remove after launch

if(!this.Schema){
  Schema = {};
};

Story = (function() {
  function Story(doc) {
    _.extend(this, doc);
    if (this.draftStory){
      _.extend(this.draftStory, {
        unpublishedChanges: (!this.published || !this.publishedAt || this.savedAt > this.publishedAt),
        savedAt: this.savedAt,
        userPathSegment: this.userPathSegment,
        authorUsername: this.authorUsername,
        authorDisplayUsername: this.authorDisplayUsername,
        authorId: this.authorId,
        authorName: this.authorName,
        contextCountOfType:  function(){}, // stub out for now
        countContextTypes:  function(){}, // stub out for now
        headerImageUrl: this.headerImageUrl.bind(this.draftStory),
        headerImageVideoObject: this.headerImageVideoObject.bind(this.draftStory),
        _id: this._id
      });
    }
  }

  Story.prototype.contentPreview = function() {
    var content;
    if (content = this.verticalSections[0].content) {
      return $($.parseHTML(content)).text();
    }
  };

  Story.prototype.updateAuthor = function(user) {
    if (user == null) {
      user = Meteor.user();
    }
    this.authorId = user._id;
    this.authorName = user.profile.name;
    return this.title = "";
  };

  var sum = function(a,b){ return a+b; };

  Story.prototype.contextCountOfType = function(type) {
    return this.contextBlocks.reduce(function(count, contextBlock){
      if(contextBlock.type === type){
        count++;
      }
      return count;
    }, 0)
  };

  Story.prototype.countContextTypes = function(){
    return _.chain(this.contextBlocks).pluck('type').countBy(_.identity).value()
  };

  Story.prototype.headerImageUrl = function(size){
    var image, imageFormat, url;
    image = this.headerImage;


    var maxWidth = (size === 'small') ? 800 : 2048;
    var maxHeight = (size === 'small') ? 230 : 350;

    if (image) {
      url = '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/c_lfill,g_north,h_' + maxHeight + ',w_' + maxWidth + '/' + image
    }
    if(this.headerImageFormat === 'gif'){ // animated header image is static jpg on phone for now //if(Meteor.Device.isPhone() && this.headerImageFormat ==='gif'){
      url += '.jpg'; // TODO, this could conflict with headerImageVideoObject if conditional changes
    }
    return url
  }

  Story.prototype.headerImageVideoObject = function(size){
    return // looping video has chops occasionally, don't show it for now
    if (this.headerImageFormat ==='gif' && !Meteor.Device.isPhone()){
      var headerImageUrl = this.headerImageUrl(size);
      return {
        previewUrl: headerImageUrl + '.jpg',
        mp4Url: headerImageUrl + '.mp4',
        webMUrl: headerImageUrl + '.webm'
      }
    }
  }

  return Story;

})();

// TO-DO consider replacing htmlclean with https://github.com/cristo-rabani/meteor-universe-html-purifier/
var cleanHtmlOptions = {
  allowedTags: ['strong', 'em', 'u', 'b', 'a', 'br'], // only allow tags used in fold-editor and
  format: false,
  removeTags: [], // allow u tag
  removeAttrs: ['class', 'id', 'href'], // strip away hrefs and other undesired attributes that might slip into a paste
  allowedAttributes: [["data-context-id"],["data-context-type"],["data-context-source"]] // data-context-id is used to direct links to context cards
};

var matchAnchors =  /<a( data-context-[a-z]*?=["|'].*?["|'])?( data-context-[a-z]*?=["|'].*?["|'])?( data-context-[a-z]*?=["|'].*?["|'])?.*?>/gm; // match anchors, capture data-context-id and other attributes so it can be kept in string
var matchBlankAnchors = /<a href="javascript:void\(0\);">(.*?)<\/a>/gm; // match anchors that are left over from above if copied from somewhere else, capture contents so can be kept

cleanVerticalSectionContent = function(html) {


  var initialClean = $.htmlClean(html, _.extend({}, _.omit(cleanHtmlOptions, 'allowedTags'), {allowEmpty: ['div']})); // do all cleaning except tag removal. allowEmpty means <div><br></div> turns into <div></div> instead of being deleted entirely
  
  var linebreakClean = initialClean
    .replace(new RegExp('<br />', 'g'), '<br>')
    .replace(new RegExp('<div><br></div>', 'g'), '<br>')
    .replace(new RegExp('<div>', 'g'), '<br>')
    .replace(new RegExp('</div>', 'g'), '');

  return $.htmlClean(linebreakClean, cleanHtmlOptions)
    .replace(matchAnchors, '<a href="javascript:void(0);"$1$2$3>') // add js void to all anchors and keep all data-context-ids and other data attributes
    .replace(matchBlankAnchors, '$1') // remove anchors without data-context-ids
    .replace(new RegExp('<br />', 'g'), '<br>');

};

if (Meteor.isClient) {
  window.Story = Story;
  window.cleanVerticalSectionContent = cleanVerticalSectionContent;
}

this.Stories = new Mongo.Collection("stories", {
  transform: function(doc) {
    return new Story(doc);
  }
});

this.Stories.deny({
  insert: function() {
    return true;
  },
  update: function() {
    return true
  },
  remove: function() {
    return true;
  }
});

this.ContextBlocks.deny({
  insert: function() {
    return true;
  },
  update: function() {
    return true
  },
  remove: function() {
    return true
  }
});

Schema.ContextBlocksExtension = new SimpleSchema({
  storyId: {
    type: String
  },
  storyShortId: {
    type: String
  }
});

this.ContextBlocks.attachSchema(Schema.ContextBlocksExtension);




var verticalSectionSchema = new SimpleSchema({
  '_id': {
    type: String
  },
  'title': {
    type: String,
    optional: true
  },
  'hasTitle': {
    type: Boolean,
    optional: true,
    defaultValue: false
  },
  'content': {
    type: String,
    trim: false
  },
  'contextBlocks': {
    type: [String],
    defaultValue: []
  }
});

var sharedStorySchemaObject = {
  headerImageFormat: {
    type: String,
    optional: true
  },
  headerImageAttribution: {
    type: String,
    optional: true
  },
  headerImage: {
    type: String,
    optional: true
  },
  storyPathSegment: {
    type: String
  },
  title: {
    type: String,
    defaultValue: ''
  },
  keywords:{
    type: [String],
    defaultValue: []
  },
  narrativeRightsReserved: {
    type: Boolean,
    optional: true
  },
  verticalSections: {
    type: [verticalSectionSchema],
    minCount: 1,
    maxCount: 1000
  }
};

var draftStorySchema = new SimpleSchema(sharedStorySchemaObject);



var analyticsSchema = new SimpleSchema({
  byConnection: {
    type: Number,
    defaultValue: 0
  },
  byIP: {
    type: Number,
    defaultValue: 0
  },
  byId: {
    type: Number,
    defaultValue: 0
  },
  total: {
    type: Number,
    defaultValue: 0
  }
});

Schema.Stories = new SimpleSchema(_.extend({}, sharedStorySchemaObject, {
    shortId: {
      type: String
    },
    savedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      autoValue: function() {
        if (this.isInsert) {
          return new Date;
        } else if (this.isUpsert) {
          return {$setOnInsert: new Date};
        } else {
          this.unset();
        }
      }
    },
    publishedAt: {
      type: Date,
      optional: true
    },
    firstPublishedAt: {
      type: Date,
      optional: true
    },
    published: {
      type: Boolean,
      defaultValue: false
    },
    everPublished: {
      type: Boolean,
      defaultValue: false
    },
    userPathSegment: {
      type: String
    },
    authorId: {
      type: String
    },
    authorName: {
      type: String
    },
    authorUsername: {
      type: String
    },
    authorDisplayUsername: {
      type: String,
      optional: true
    },

    deleted: {
      type: Boolean,
      defaultValue: false
    },
    deletedAt: {
      type: Date,
      optional: true
    },

    favorited: {
      type: [String],
      defaultValue: []
    },
    favoritedTotal: {
      type: Number,
      defaultValue: 0
    },
    editorsPick: {
      type: Boolean,
      optional: true
    },
    editorsPickAt: {
      type: Date,
      optional: true
    },

    analytics: {
      type: Object
    },
    'analytics.views': {
      type: analyticsSchema
    },
    'analytics.shares': {
      type: analyticsSchema
    },
    contextBlocks: {
      type: [ContextBlock], // TODO this should really be Schema.ContextBlocks, but would need to be converted to a regular object, otherwise simple-schema complains
      minCount: 0,
      maxCount: 1000,
      defaultValue: []
    },
    contextBlockIds: {
      type: [String],
      minCount: 0,
      maxCount: 1000,
      defaultValue: []
    },
    contextBlockTypeCount:{
      type: Object,
      optional: true,
      blackbox: true
    },
    draftStory: {
      type: draftStorySchema
    },
    'version': {
      type: String,
      optional: true
    }
  })
);

this.Stories.attachSchema(Schema.Stories);



this.StoryStats = new Mongo.Collection("story_stats");


this.StoryStats.deny({
  insert: function() {
    return true;
  },
  update: function() {
    return true
  },
  remove: function() {
    return true
  }
});

var deepAnalyticsSchema = new SimpleSchema({
  uniqueViewersByConnection: {
    type: [String],
    defaultValue: []
  },
  uniqueViewersByIP: {
    type: [String],
    defaultValue: []
  },
  uniqueViewersByUserId: {
    type: [String],
    defaultValue: []
  },
  all: {
    type: [Object],
    blackbox: true
  }
});

Schema.StoryStats = new SimpleSchema({
  storyId: {
    type: String
  },
  deepAnalytics: {
    type: Object,
    optional: true
  },
  'deepAnalytics.views': {
    type: deepAnalyticsSchema
  },
  'deepAnalytics.shares': {
    type: deepAnalyticsSchema
  },
  analytics: {
    type: analyticsSchema,
    optional: true
  },
  'analytics.views': {
    type: analyticsSchema
  },
  'analytics.shares': {
    type: analyticsSchema
  }
});

this.StoryStats.attachSchema(Schema.StoryStats);


this.StoryHistories = new Mongo.Collection("story_histories");



// DEEPSTREAM

Deepstream = (function() {
  function Deepstream(doc) {
    _.extend(this, doc);
  }

  Deepstream.prototype.contextCountOfType = function(type) {
    return this.contextBlocks.reduce(function(count, contextBlock){
      if(contextBlock.type === type){
        count++;
      }
      return count;
    }, 0)
  };

  Deepstream.prototype.countContextTypes = function(){
    return _.chain(this.contextBlocks).pluck('type').countBy(_.identity).value()
  };

  Deepstream.prototype.activeStream = function(){
    streamObj = _.findWhere(this.streams, {_id: this.activeStreamId});
    return new Stream(streamObj)
  };

  return Deepstream;

})();


this.Deepstreams = new Mongo.Collection("deepstreams", {
  transform: function(doc) {
    return new Deepstream(doc);
  }
});

this.Deepstreams.allow({
  insert: function() {
    return true;
  },
  update: function() {
    return true
  },
  remove: function() {
    return true;
  }
});

Stream = (function() {
  function Stream(doc) {
    _.extend(this, doc);
  }

  Stream.prototype.title = function () {
    if (this.source === 'youtube') {
      return this.reference.title
    }
  };

  Stream.prototype.caption = function () {
    if (this.source === 'youtube') {
      return this.reference.description
    }
  };

  Stream.prototype.username = function () {
    if (this.source === 'youtube') {
      return this.reference.username
    }
  };

  Stream.prototype.creationDate = function () {
    if (this.source === 'youtube') {
      return this.reference.creationDate
    }
  };

  Stream.prototype.url = function () {
    if (this.source === 'youtube') {
      return '//www.youtube.com/embed/' + this.reference.id + '?autoplay=1';
    }
  };

  Stream.prototype.previewUrl = function () {
    if (this.source === 'youtube') {
      return '//img.youtube.com/vi/' + this.reference.id + '/0.jpg';
    }
  };

  Stream.prototype.thumbnailUrl = function () {
    if (this.source === 'youtube') {
      return '//i.ytimg.com/vi/' + this.reference.id + '/default.jpg';
    }
  };

  return Stream;

})();
