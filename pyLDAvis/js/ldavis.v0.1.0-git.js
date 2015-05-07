/* Original code taken from https://github.com/cpsievert/LDAvis */
/* Copyright 2013, AT&T Intellectual Property */
/* MIT Licence */

'use strict';

var LDAvis = function(to_select, data_or_file_name) {

    // Set up a few 'global' variables to hold the data:
    var K, // number of topics
        R, // number of terms to display in bar chart
        mdsData, // (x,y) locations and topic proportions
        mdsData3, // topic proportions for all terms in the viz
        lamData, // all terms that are among the top-R most relevant for all topics, lambda values
        color1 = "#1f77b4", // baseline color for default topic circles and overall term frequencies
        color2 = "#d62728"; // 'highlight' color for selected topics and term-topic frequencies

    // Set the duration of each half of the transition:
    var duration = 750;

    // Set global margins used for everything
    var margin = {
        top: 30,
        right: 30,
        bottom: 70,
        left: 30
    },
        mdswidth = 530,
        mdsheight = 530,
        barwidth = 530,
        barheight = 530,
        termwidth = 90, // width to add between two panels to display terms
        mdsarea = mdsheight * mdswidth;
    // controls how big the maximum circle can be
    // doesn't depend on data, only on mds width and height:
    var rMax = 60;

    // proportion of area of MDS plot to which the sum of default topic circle areas is set
    var circle_prop = 0.25;
    var word_prop = 0.25;

    // opacity of topic circles:
    var base_opacity = 0.2,
        highlight_opacity = 0.6;

    // topic/lambda selection names are specific to *this* vis
    var topic_select = to_select + "-topic";
    var lambda_select = to_select + "-lambda";

    // get rid of the # in the to_select (useful) for setting ID values
    var visID = to_select.replace("#", "");
    var topicID = visID + "-topic";
    var lambdaID = visID + "-lambda";
    var termID = visID + "-term";
    var topicDown = topicID + "-down";
    var topicUp = topicID + "-up";
    var topicClear = topicID + "-clear";

    var leftPanelID = visID + "-leftpanel";
    var barFreqsID = visID + "-bar-freqs";
    var topID = visID + "-top";
    var lambdaInputID = visID + "-lambdaInput";
    var lambdaZeroID = visID + "-lambdaZero";
    var sliderDivID = visID + "-sliderdiv";
    var lambdaLabelID = visID + "-lamlabel";

    //////////////////////////////////////////////////////////////////////////////

    // sort array according to a specified object key name
    // Note that default is decreasing sort, set decreasing = -1 for increasing
    // adpated from http://stackoverflow.com/questions/16648076/sort-array-on-key-value
    function fancysort(key_name, decreasing) {
        decreasing = (typeof decreasing === "undefined") ? 1 : decreasing;
        return function(a, b) {
            if (a[key_name] < b[key_name])
                return 1 * decreasing;
            if (a[key_name] > b[key_name])
                return -1 * decreasing;
            return 0;
        };
    }


    function visualize(data) {


        // set the number of topics to global variable K:
        K = data['mdsDat'].x.length;

        // R is the number of top relevant (or salient) words whose bars we display
        R = data['R'];

        // a (K x 5) matrix with columns x, y, topics, Freq, cluster (where x and y are locations for left panel)
        mdsData = [];
        for (var i = 0; i < K; i++) {
            var obj = {};
            for (var key in data['mdsDat']) {
                obj[key] = data['mdsDat'][key][i];
            }
            mdsData.push(obj);
        }

        // a huge matrix with 3 columns: Term, Topic, Freq, where Freq is all non-zero probabilities of topics given terms
        // for the terms that appear in the barcharts for this data
        mdsData3 = [];
        for (var i = 0; i < data['token.table'].Term.length; i++) {
            var obj = {};
            for (var key in data['token.table']) {
                obj[key] = data['token.table'][key][i];
            }
            mdsData3.push(obj);
        }

        // large data for the widths of bars in bar-charts. 6 columns: Term, logprob, loglift, Freq, Total, Category
        // Contains all possible terms for topics in (1, 2, ..., k) and lambda in the user-supplied grid of lambda values
        // which defaults to (0, 0.01, 0.02, ..., 0.99, 1).
        lamData = [];
        for (var i = 0; i < data['tinfo'].Term.length; i++) {
            var obj = {};
            for (var key in data['tinfo']) {
                obj[key] = data['tinfo'][key][i];
            }
            lamData.push(obj);
        }

        // Create new svg element (that will contain everything):
        var svg = d3.select(to_select).append("svg")
                .attr("width", mdswidth + barwidth + margin.left + termwidth + margin.right)
                .attr("height", mdsheight + 2 * margin.top + margin.bottom + 2 * rMax);

        var state = VisState(termID, topicID);
        state.set('K', data['mdsDat'].x.length)
            .set('R', data['R'])
            .set('rMax', rMax);

        var topicbars = TopicBars(svg, {
            width: barwidth,
            height: barheight,
            id: topicID,
            data: lamData,
            bg_color: color1,
            highlight_color: color2,
            to_select: to_select,
            margin: margin,
            termID: termID,
            state: state
        });
        topicbars();

        var forms = Forms({
            state: state,
            data: mdsData,
            mdswidth: mdswidth,
            topicbars: topicbars,
            termID: termID,
            to_select: to_select,
            topicID: topicID,
            visID: visID,
            width: mdswidth,
            height: mdsheight
        });
        forms();

        var mdsplot = BubbleChart(svg, {
            margin: margin,
            bg_color: color1,
            highlight_color: color2,
            x_label: "PC1",
            y_label: "PC2",
            height: mdsheight,
            width: mdswidth,
            topicID: topicID,
            visID: visID,
            lamData: lamData,
            barheight: barheight,
            barwidth: barwidth,
            to_select: to_select,
            termID: termID,
            mdsData3: mdsData3,
            data: mdsData,
            state: state
        });
        mdsplot();

    }

    if (typeof data_or_file_name === 'string')
        d3.json(data_or_file_name, function(error, data) {visualize(data);});
    else
        visualize(data_or_file_name);

    // var current_clicked = {
    //     what: "nothing",
    //     element: undefined
    // },

    //debugger;

};
