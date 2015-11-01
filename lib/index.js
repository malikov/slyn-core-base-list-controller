/*
    Base list controller
*/
"use strict";

var q = require('q');
var BaseController = require('slyn-core-base-controller');

var Controller = function(backboneView, model) {
    BaseController.call(this, backboneView, model);
    this.name = 'BaseListController';
}

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

    this.resolveData(params)
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

            // at  this point we have all the data we need render the view
            this.preRender().then(function(output) {
                return this.render(output);
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

Controller.prototype.resolveData = function(params) {
    var deferred = q.defer();

    if (this.modelClass !== null) {
        var query = (params !== null && params.query) ? params.query : {};

        this.model = PageManager.instantiateModel({
            model: this.modelClass,
            params: null
        });

        this.model.fetch({
            data: query,
            success: function(data) {
                //deferred.resolve(data);
                deferred.resolve(this.model,params);
            }.bind(this),
            error: function(error) {
                deferred.reject(error);
            }.bind(this)
        });
    } else {
        setTimeout(function() {
            deferred.resolve({});
        }.bind(this), 0);
    }

    return deferred.promise;
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
    this.view.postRender()
        .then(function() {
            // success
            deferred.resolve(this);
        }.bind(this), function() {
            // error
            deferred.reject();
        }.bind(this));
    return deferred.promise;
};

module.exports = Controller;
