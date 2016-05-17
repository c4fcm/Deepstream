
// DEEPSTREAM

Deepstream = (function() {
  function Deepstream(doc) {
    _.extend(this, doc);
    var that = this;
    this.streams = _.map(this.streams, function(stream){
      return new Stream(stream);
    });
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

  Deepstream.prototype.contextBlockSortFunction = function(cBlock){
    let internalCBlock = _.findWhere(this.contextBlocks, {_id: cBlock._id});

    if (internalCBlock){
      return internalCBlock.rank - _.indexOf(this.contextBlocks, internalCBlock) / 10000; // break ties with order added
    }
  };

  Deepstream.prototype.orderedInternalContext = function() {
    var that = this;
    return _.sortBy(this.contextBlocks, function(e){
      return that.contextBlockSortFunction(e)
    });
  };

  Deepstream.prototype.orderedContextIds = function() {
    return _.pluck(this.orderedInternalContext(), '_id');
  };

  Deepstream.prototype.orderedContext = function(sortByVideoMarker) {
    var that = this;
    var sortedBlocks =  _.sortBy(ContextBlocks.find({streamShortId: this.shortId}).fetch(), function(e){return that.contextBlockSortFunction(e)});
    if(sortByVideoMarker){
      sortedBlocks = _.sortBy(sortedBlocks, function(block){ return parseFloat(block.videoMarker)*-1; });
    }
    return sortedBlocks;
    
  };

  Deepstream.prototype.internalContextOfType = function(type) {
    if (type === 'stream'){
      return []; // streams aren't context
    }

    return _.chain(this.contextBlocks)
      .where({type : type})
      .value();
  };


  Deepstream.prototype.internalContextOfTypes = function(types) {
    var that = this;
    return _.chain(types)
      .map(function(type){return that.internalContextOfType(type)})
      .flatten()
      .compact()
      .value();
  };

  Deepstream.prototype.hasContextOfType = function(type) {
    return this.internalContextOfType(type).length;
  };

  Deepstream.prototype.mostRecentContextOfType = function(type) {
    if(this.hasContextOfType(type)){
      let id = (this.contextBlocks ? _.last(_.sortBy(this.internalContextOfType(type), 'addedAt')) : {})._id;
      if(id){
        return ContextBlocks.findOne(id);
      }
    }
  };

  Deepstream.prototype.mostRecentContextOfTypes = function(types) {
    this.mostRecentContextsOfTypes(types, 1);
  };

  Deepstream.prototype.mostRecentContextsOfTypes = function(types, number) {
    return _.chain(this.internalContextOfTypes(types))
      .sortBy('addedAt')
      .map(function(internalCBlock){
        return ContextBlocks.findOne(internalCBlock._id)
      })
      .compact()
      .last(number)
      .value()
  };

  Deepstream.prototype.mostRecentContextId = function() {
    if (this.contextBlocks) {
      let id = (this.contextBlocks ? _.last(_.sortBy(this.contextBlocks, 'addedAt')) : {})._id;
      return id
    }
  }

  Deepstream.prototype.topContextsOfTypes = function(types, number) {
    return _.chain(this.internalContextOfTypes(types))
      .sortBy('addedAt')
      .reverse()
      .sortBy('rank')
      .map(function(internalCBlock){
        return ContextBlocks.findOne(internalCBlock._id)
      })
      .compact()
      .first(number)
      .value()
  };

  Deepstream.prototype.activeStream = function(){
    return this.getStream(this.activeStreamId);
  };

  Deepstream.prototype.getStream = function(id){
    return _.findWhere(this.streams, {_id: id});
  };

  Deepstream.prototype.getCuratorWebcamStream = function(){
    return new Stream(this.curatorWebcamStream);
  };

  Deepstream.prototype.watchPath = function(){
    return '/watch/' + this.userPathSegment + '/' + this.streamPathSegment;
  };

  Deepstream.prototype.curatePath = function(){
    return '/curate/' + this.userPathSegment + '/' + this.streamPathSegment;
  };

  Deepstream.prototype.defaultPreviewUrl = "http://res.cloudinary.com/deepstream/image/upload/v1445697869/Default_Thumbnail_xyoxwn.png";

  Deepstream.prototype.previewUrl = function(){
    var activeStream = this.activeStream();
    return activeStream && activeStream.hasPreviewImage() ? activeStream.previewUrl() : this.defaultPreviewUrl;
  };
  Deepstream.prototype.userStreamSwitchAllowed = function(){
    return !this.directorMode;
  };

  Deepstream.prototype.viewCount = function(){
    if(this.analytics){
      return this.analytics.views.total;
    }
  };

  Deepstream.prototype.pendingSuggestions = function(){
    return SuggestedContextBlocks.find({streamShortId: this.shortId, suggestionStatus: 'pending'});
  };

  Deepstream.prototype.hasPendingSuggestions = function(){
    return this.pendingSuggestions().count() ? true : false;
  };

  return Deepstream;

})();
