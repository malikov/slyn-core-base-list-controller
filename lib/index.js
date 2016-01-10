/*
    Base list controller
*/
"use strict";

var q = require('q');
var BaseController = require('slyn-core-base-controller');
var PageManager = require('slyn-page-manager');
var Binder = require('slyn-data-binder');

var Controller = function(backboneView, model, options) {
    BaseController.call(this, backboneView, model);
    this.name = 'BaseListController';
    
    this.infinite = (options && options.infinite)? options.infinite : false;
    
    var _loading = false;
    this.loadMore = function(data){
      // 1. call resolve Data
      if(_loading)
        return;
        
        _loading = true;
        this.view.loadMore(_loading);
        this.resolveData(this.params, this.infinite).then(function(){
            _loading = false;
            this.view.loadMore(_loading);
        }.bind(this)).catch(function(err){
          console.log(err);  
        });
    };
};

Controller.prototype = Object.create(BaseController.prototype);
Controller.prototype.constructor = Controller;
Controller.prototype.load = function(rootEl, template, itemTemplate, params, resolve) {
    if (!rootEl)
        throw new Error("Controller" + this.name + " missing arguments : rootEl");

    if (!template)
        throw new Error("Controller" + this.name + " missing arguments : template");

    if (!itemTemplate)
        throw new Error("Controller" + this.name + " missing arguments : itemTemplate");

    console.log('Loading : ' + this.name + ' controller');

    var deferred = q.defer();

    this.resolveData(params, this.infinite)
        .then(function(models) {
            this.view = PageManager.instantiateView({
                view: this.backboneView,
                params: {
                    el: rootEl,
                    template: template,
                    itemTemplate: itemTemplate,
                    data: models,
                    params: params
                }
            });
            
            this.params = params;
            
            if(this.infinite){
                // listen to changes on the model and call renderItems function
                
                this.view.collection.on('reset', this.reRender.bind(this));
            }

            // at  this point we have all the data we need render the view
            this.preRender().then(function(output) {
                return this.render({infinite: this.infinite});
            }.bind(this)).then(function(output) {
                return this.postRender(output);
            }.bind(this)).then(function(output) {
                deferred.resolve(output);
            }.bind(this));
        }.bind(this)).catch(function(error) {
            console.log('error loading controller');
            deferred.reject(error);
        }.bind(this));

    return deferred.promise;
};

Controller.prototype.resolveData = function(params, infinite) {
    var deferred = q.defer();

    if (this.modelClass !== null) {
        var query = (params !== null && params.query) ? params.query : null;
        
        if(!this.model){
            this.model = PageManager.instantiateModel({
                model: this.modelClass,
                params: null
            });    
        }
        
        if(query != null){
            
            if(infinite){
                query.i = this.model.i; // increment
                query.c = this.model.c; // count
            }
            
            this.model.fetch({
                data: query,
                reset: infinite,
                success: function(data) {
                    //deferred.resolve(data);
                    deferred.resolve(this.model,params);
                }.bind(this),
                error: function(error) {
                    deferred.reject(error);
                }.bind(this)
            });
        }else{
            setTimeout(function() {
                deferred.resolve(this.model, params);
            }.bind(this), 0);
        }
    } else {
        setTimeout(function() {
            deferred.resolve({});
        }.bind(this), 0);
    }

    return deferred.promise;
};

Controller.prototype.reRender = function(){
     // at  this point we have all the data we need render the view
    this.preRender().then(function(output) {
        return this.render(output);
    }.bind(this)).then(function(output) {
        return this.postRender({
            data: output, 
            triggerOnPageLoaded: true
        });
    }.bind(this)).then(function(output) {
        console.log('reRender successful');
        Binder.applyBinding(this.view, this); // reapply binding to the view
    }.bind(this)).catch(function(err){
        console.log(err);
    });
};

Controller.prototype.preRender = function(options) {
    var deferred = q.defer();
    this.view.preRender()
        .then(function() {
            // success
            deferred.resolve(this);
        }.bind(this), function() {
            // error
            deferred.reject();
        }.bind(this));
    return deferred.promise;
};

Controller.prototype.postRender = function(options) {
    var deferred = q.defer();
    this.view.postRender(options)
        .then(function() {
            // success
            deferred.resolve(this);
        }.bind(this), function() {
            // error
            deferred.reject();
        }.bind(this));
    return deferred.promise;
};


Controller.prototype.unload = function() {
    BaseController.prototype.unload.call(this, null);
    this.view.collection.off();
    this.view.reset();
    
};
module.exports = Controller;
