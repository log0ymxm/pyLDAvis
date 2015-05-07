'use strict';

function VisState(termID, topicID) {
    var local_state = {lambda: 1, topic: 0, term: ""};
    var local_callbacks = {};

    function state() {}

    state.get = function(field) {
        return local_state[field];
    };

    state.getElem = function(field, val) {
        var id = val || local_state[field];
        if (field === 'term') {
            return document.getElementById(termID + id);
        } else if (field === 'topic') {
            return document.getElementById(topicID + id);
        }
        return null;
    };

    state.set = function(field, new_val) {
        if (new_val == null || new_val == undefined) return state;

        var old_val = local_state[field];

        if (new_val === old_val) return state;

        if (field === 'topic') {
            // TODO ensure topic is always a num
            new_val = Math.round(Math.min(local_state.K, Math.max(0, new_val)));
        } else if (field === 'lambda') {
            new_val = Math.min(1, Math.max(0, new_val));
        }

        local_state[field] = new_val;
        for (var i in local_callbacks[field]) {
            var cb = local_callbacks[field][i];
            console.log('- cb', field, new_val, typeof new_val, old_val, typeof old_val);
            cb(new_val, old_val);
        }

        return state.save();
    };

    state.on = function(field, cb) {
        if (!local_callbacks[field]) local_callbacks[field] = [];
        //console.log('--- on', field, cb);
        local_callbacks[field].push(cb);
    };

    state.url = function() {
        return location.origin + location.pathname + "#topic=" + local_state['topic'] +
            "&lambda=" + local_state['lambda'] + "&term=" + local_state['term'];
        return state;
    };

    state.reset = function() {
        return state
            .set("term", "")
            .set("topic", 0)
            .save();
    };

    state.save = function() {
        history.replaceState(local_state, "Query", state.url());
        return state;
    };

    state.load = function() {
        // serialize the visualization state using fragment identifiers
        // -- http://en.wikipedia.org/wiki/Fragment_identifier
        // location.hash holds the address information
        var params = location.hash.split("&");
        if (params.length > 1) {
            state.set("topic", params[0].split("=")[1])
                .set("lambda", params[1].split("=")[1])
                .set("term", params[2].split("=")[1]);
        }
        return state;
    };

    return state;
}
