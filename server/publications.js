Deepstreams._ensureIndex({
  shortId: 1
}, {
  unique: 1
});

Deepstreams._ensureIndex({
  onAir: 1
});

//Deepstreams._ensureIndex({
//  curatorId: 1
//});
//

ContextBlocks._ensureIndex({
  streamShortId: 1
});

ContextBlocks._ensureIndex({
  videoMarker: 1
});

ContextBlocks._ensureIndex({
  deleted: 1
});

SuggestedContextBlocks._ensureIndex({
  streamShortId: 1
});

SuggestedContextBlocks._ensureIndex({
  suggestionStatus: 1
});


Meteor.users._ensureIndex({
  username: 1
});


//Streams._ensureIndex({
//  title: "text",
//  description: "text"
//});


var deepstreamFields = {
  'deleted': 0,
  'streams.fullDetails': 0,
  'streams.reference.description': 0,
  'streams.authorId': 0,
  'streams.searchQuery': 0,
  'analytics.shares': 0,
  'analytics.views.byConnection': 0,
  'analytics.views.byIP': 0,
  'analytics.views.byId': 0,
  'curatorSignupCodes': 0
};

var contextFields = {
  'fullDetails': 0,
  'authorId': 0,
  'savedAt': 0,
  'addedAt': 0,
  'searchQuery': 0
};

//var readStoryFields = {
//  draftStory: 0,
//  history: 0,
//  narrativeRightsReserved: 0,
//  //savedAt: 0, // used in analytics
//  //createdAt:0, // used in analytics
//  everPublished:0,
//  //deleted: 0, // currently always blank so no need to filter
//  //deletedAt: 0, // currently always blank so no need to filter
//  'analytics.shares': 0,
//  //'contextBlocks.authorId': 0, // used in analytics
//  //'contextBlocks.storyShortId': 0, // used in analytics
//  'contextBlocks.storyId': 0,
//  'contextBlocks.version': 0,
//  'contextBlocks.savedAt': 0,
//  'contextBlocks.publishedAt': 0,
//  'contextBlocks.createdAt': 0,
//  'contextBlocks.fullDetails': 0,
//  'contextBlocks.published': 0,
//  'contextBlocks.everPublished': 0,
//  'contextBlocks.searchQuery': 0,
//  'contextBlocks.searchOption': 0
//};

//var previewStoryFields = {
//  shortId: 1,
//  savedAt: 1,
//  publishedAt: 1,
//  published: 1,
//  userPathSegment: 1,
//  authorId: 1,
//  authorName: 1,
//  authorUsername: 1,
//  //favorited: 1, // will need to add this back in for non-curated stories to use preview
//  editorsPick: 1,
//  editorsPickAt: 1,
//  //'analytics.views': 1,  // will need to add this back in for non-curated stories to use preview
//  contextBlockTypeCount: 1,
//  headerImageFormat: 1,
//  headerImage: 1,
//  favoritedTotal: 1,
//  storyPathSegment: 1,
//  title: 1
//};

Meteor.publish("deepstreamsOnAir", function(options) {
  options = options ? options : {};
  _.defaults(options, {page: 0});

  return Deepstreams.find({
    onAir: true
  }, {
    sort: {
      live: -1
    },
    fields: deepstreamFields,
    skip: options.page * PUB_SIZE,
    limit: PUB_SIZE
  });
});

//Meteor.publish("curatedStoriesPub", function(options) {
//  options = options ? options : {};
//  _.defaults(options, {page: 0});
//
//  return Stories.find({
//    published: true,
//    editorsPick: true
//  }, {
//    fields: options.preview ? previewStoryFields : readStoryFields,
//    skip: options.page * PUB_SIZE,
//    sort: {
//      editorsPickAt: -1
//    },
//    limit: PUB_SIZE
//  });
//});

Meteor.publish("bestStreams", function() {
  return Streams.find({ oneIfCurrent: 1 }, {
    sort: {
      currentViewers: -1
    },
    limit: 20
  });
});
Meteor.publish("mostRecentStreams", function() {
  return Streams.find({ oneIfCurrent: 1 }, {
    sort: {
      creationDate: -1
    },
    limit: 20
  });
});


Meteor.publish("singleDeepstreamOnAir", function(userPathSegment, shortId) {
  check(shortId, String);
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, onAir: true},{
      fields: deepstreamFields
    });  
});

Meteor.publish("singleDeepstream", function(userPathSegment, shortId) {
  check(shortId, String);
  if (this.userId) {
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, $or: [{curatorIds: this.userId}, {onAir: true}]},{
      fields: deepstreamFields
    });
  } else {
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, onAir: true},{
      fields: deepstreamFields
    });
  }
});

Meteor.publish("deepstreamContext", function(streamShortId) {
  check(streamShortId, String);
  return ContextBlocks.find({streamShortId: streamShortId, deleted: {$ne: true}},{
    fields: contextFields
  });
});

Meteor.publish("deepstreamSuggestedContext", function(streamShortId) {
  check(streamShortId, String);
  return SuggestedContextBlocks.find({streamShortId: streamShortId, suggestionStatus: 'pending'},{
    fields: contextFields
  });
});

Meteor.publish("deepstreamPreviewContext", function(streamShortId) {
  check(streamShortId, String);
  return ContextBlocks.find({streamShortId: streamShortId, deleted: {$ne: true}, type: {$in: HOMEPAGE_PREVIEW_CONTEXT_TYPES}},{
    fields: contextFields
  });
});

Meteor.publish("myDeepstreams", function() {
  return Deepstreams.find({curatorIds: this.userId, deleted: {$ne: true}}, {
    fields: deepstreamFields
  });
});

//Meteor.publish("curatedStoriesPub", function(options) {
//  options = options ? options : {};
//  _.defaults(options, {page: 0});
//
//  return Stories.find({
//    published: true,
//    editorsPick: true
//  }, {
//    fields: options.preview ? previewStoryFields : readStoryFields,
//    skip: options.page * PUB_SIZE,
//    sort: {
//      editorsPickAt: -1
//    },
//    limit: PUB_SIZE
//  });
//});

Meteor.publish("minimalUsersPub", function(userIds) {
  if (!userIds || !userIds.length || userIds.length > 1000) {
    return this.ready();
  }
  return Meteor.users.find({_id: {
    $in: userIds
  }}, {
    fields: {
      "profile.name": 1,
      "username": 1
    }
  });
});

Meteor.publish("userData", function () {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId},
      {fields: {
        'accessPriority': 1,
        "services.twitter.id": 1,
        "admin": 1,
        "profile": 1
      }});
  } else {
    this.ready();
  }
});


// this publishes info on server facts (used on /stats page)
Facts.setUserIdFilter(function (userId) {
  var user = Meteor.users.findOne(userId);
  return user && user.admin;
});
