// ===========================================================
// Context Object when creating all the docker files

var _ = require('underscore');
var dot = require('dot');
dot.templateSettings.strip = false;
var fs = require('fs');

module.exports = function(image, templates, blocks) {

  var paramConfig = {};
  var path = [];
  var params = {};

  this.pushParamValue = function (el) {
    path.push(el);
  };

  this.popParamValue = function () {
    path.pop();
  };

  this.updateParamValue = function (type, val) {
    params[type] = val;
    paramConfig[type] = _.extend({}, this.getParamConfigFor(type, val));
  };

  this.getParamValuesFor = function (type) {
    var config = image.config.config[type] || {};
    return _.keys(config).sort();
  };

  this.getParamConfigFor = function (type, val) {
    var c = image.config.config[type] || {};
    return c[val] || {};
  };

  this.getParamLabel = function () {
    return path.join(", ");
  };

  this.getDirectoryPath = function (root) {
    return root + "/" + image.dir + "/" + path.join("/");
  };

  this.forEachTemplate = function (fn) {
    templates.forEach(fn);
  };

  this.fillTemplate = function(file, template) {
    var context = getTemplateContext(fillBlocks());
    var newContent = template(context).trim() + "\n";
    if (!newContent.length) {
      return "SKIPPED".grey;
    } else {
      var exists = fs.existsSync(file);
      var oldContent = exists ? fs.readFileSync(file, "utf8") : undefined;
      if (!oldContent || newContent.trim() !== oldContent.trim()) {
        fs.writeFileSync(file, newContent, {"encoding": "utf8"});
        return exists ? "CHANGED".green : "NEW".yellow;
      }
    }
    return undefined;
  };

  this.checkForMapping = function (file) {
    if (/^__.*$/.test(file)) {
      var mapping = undefined;
      params.keys().forEach(function (param) {
        var mappings = this.getParamConfigFor(param)["mappings"];
        if (!mappings) {
          mappings = image.config.config["default"].mappings;
        }
        if (mappings) {
          mapping = mappings[file];
        }
      }, this);
      return mapping;
    } else {
      return file;
    }
  };

  // ===========================================================================================
  // Private methods

  function getTemplateContext(blocks) {
    return _.extend(
      {},
      image.config,
      blocks ? {"blocks": blocks} : {},
      {
        "param":  params,
        "blocks": blocks,
        "config": _.extend({}, image.config.config['default'], paramConfig)
      });
  }

  function fillBlocks() {
    var ret = {};
    for (var key in blocks) {
      if (blocks.hasOwnProperty(key)) {
        var template = dot.template(blocks[key]);
        ret[key] = template(getTemplateContext());
      }
    }
    return ret;
  }

};


