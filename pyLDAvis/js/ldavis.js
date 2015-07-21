/* Original code taken from https://github.com/cpsievert/LDAvis */
/* Copyright 2013, AT&T Intellectual Property */
/* MIT Licence */

'use strict';

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

var Data = function(data, config) {

    var local_state = {
        rMax: 60,
        K: data['mdsDat'].x.length,
        R: Math.min(data['R'], 30),
        topic: 0,
        term: "",
        lambda: 1
    };
    local_state.mdsData = extract_data(data['mdsDat'], local_state.K);
    local_state.mdsData3 = extract_data(data['token.table'], data['token.table'].Term.length);
    local_state.lamData = extract_data(data['tinfo'], data['tinfo'].Term.length);

    var local_callbacks = {};

    var termID = config.termID,
        topicID = config.topicID;

    function extract_data(data, l) {
        var d = [];
        for (var i = 0; i < l; i++) {
            var obj = {};
            for (var key in data) {
                obj[key] = data[key][i];
            }
            d.push(obj);
        }
        return d;
    }

    function updateData(field) {
        local_state['termFiltered'] = local_state.mdsData3.filter(function(d) {
            return d.Term === local_state.term;
        });
        local_state['lamTopicData'] = local_state.lamData
            .filter(function(d) {
                if (field === "tmp_topic" && local_state.tmp_topic != 0) {
                    return d.Category === "Topic" + local_state.tmp_topic;
                } else if (local_state.topic != 0) {
                    return d.Category === "Topic" + local_state.topic;
                } else {
                    return d.Category === "Default";
                }
            })
            .map(function(d) {
                d.relevance = local_state.lambda * d.logprob +
                    (1 - local_state.lambda) * d.loglift;
                return d;
            })
            .sort(fancysort("relevance"))
            .slice(0, local_state.R);
        local_state['lamTopicTerms'] = local_state['lamTopicData'].map(function(d) {return d.Term;});
        local_state['lamTopicMax'] = d3.max(local_state['lamTopicData'], function(d) {return d.Total;});
    }

    function state() {
        updateData();
    }

    state.get = function(field) {return local_state[field];};

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
            // TODO ensure topic is always a numeric value
            new_val = Math.round(Math.min(local_state.K, Math.max(0, new_val)));
        } else if (field === 'lambda') {
            new_val = Math.min(1, Math.max(0, new_val));
        }

        local_state[field] = new_val;

        updateData(field, new_val);

        // Run all callbacks
        for (var i in local_callbacks[field]) {
            var cb = local_callbacks[field][i];
            cb(new_val, old_val);
        }

        return state;
    };

    state.on = function(field, cb) {
        if (!local_callbacks[field]) local_callbacks[field] = [];
        local_callbacks[field].push(cb);
    };

    state.url = function() {
        return location.origin + location.pathname + "#topic=" + local_state['topic'] +
            "&lambda=" + local_state['lambda'] + "&term=" + local_state['term'];
    };

    state.reset = function() {
        return state.set("term", "")
            .set("topic", 0)
            .save();
    };

    state.save = function() {
        var save_state = {
            topic: local_state.topic,
            term: local_state.term,
            lambda: local_state.lambda
        };
        history.replaceState(save_state, "Query", state.url());
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

    // Initialize state
    state();

    return state;
};

var LDAvis = function(to_select, data_or_file_name) {

    var color1 = "#1f77b4", // baseline color for default topic circles and overall term frequencies
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

    var vis_state;

    //////////////////////////////////////////////////////////////////////////////

    function visualize(data) {

        vis_state = Data(data, {
            termID: termID,
            topicID: topicID
        });

        // Create the topic input & lambda slider forms. Inspired from:
        // http://bl.ocks.org/d3noob/10632804
        // http://bl.ocks.org/d3noob/10633704
        init_forms(topicID, lambdaID, visID);

        // When the value of lambda changes, update the visualization
        vis_state.on('lambda', function(lambda, old_lambda) {
            var increased = old_lambda < lambda;
            if (vis_state.get('topic') > 0) reorder_bars(increased);
            document.getElementById(lambdaID).value = lambda;
        });

        d3.select(lambda_select)
            .on("mouseup", function() {
                vis_state.set('lambda', +this.value).save();
            });

        d3.select("#" + topicUp)
            .on("click", function() {
                vis_state.set('term', "")
                    .set("topic", vis_state.get("topic") + 1)
                    .save();
            });

        d3.select("#" + topicDown)
            .on("click", function() {
                vis_state.set('term', "")
                    .set("topic", vis_state.get("topic") - 1)
                    .save();
            });

        d3.select("#" + topicID)
            .on("keyup", function() {
                vis_state.set("term", "")
                    .set("topic", document.getElementById(topicID).value)
                    .save();
            });

        d3.select("#" + topicClear)
            .on("click", function() {
                vis_state.reset();
           });

        // create linear scaling to pixels (and add some padding on outer region of scatterplot)
        var xrange = d3.extent(vis_state.get('mdsData'), function(d) {return d.x;});
        var xdiff = xrange[1] - xrange[0],
            xpad = 0.05;
        var yrange = d3.extent(vis_state.get('mdsData'), function(d) {return d.y;});
        var ydiff = yrange[1] - yrange[0],
            ypad = 0.05;

        if (xdiff > ydiff) {
            var xScale = d3.scale.linear()
                    .range([0, mdswidth])
                    .domain([xrange[0] - xpad * xdiff, xrange[1] + xpad * xdiff]);

            var yScale = d3.scale.linear()
                    .range([mdsheight, 0])
                    .domain([yrange[0] - 0.5*(xdiff - ydiff) - ypad*xdiff, yrange[1] + 0.5*(xdiff - ydiff) + ypad*xdiff]);
        } else {
            var xScale = d3.scale.linear()
                    .range([0, mdswidth])
                    .domain([xrange[0] - 0.5*(ydiff - xdiff) - xpad*ydiff, xrange[1] + 0.5*(ydiff - xdiff) + xpad*ydiff]);

            var yScale = d3.scale.linear()
                    .range([mdsheight, 0])
                    .domain([yrange[0] - ypad * ydiff, yrange[1] + ypad * ydiff]);
        }

        // Create new svg element (that will contain everything):
        var svg = d3.select(to_select).append("svg")
                .attr("width", mdswidth + barwidth + margin.left + termwidth + margin.right)
                .attr("height", mdsheight + 2 * margin.top + margin.bottom + 2 * vis_state.get('rMax'));

        // Create a group for the mds plot
        var mdsplot = svg.append("g")
                .attr("id", leftPanelID)
                .attr("class", "points")
                .attr("transform", "translate(" + margin.left + "," + 2 * margin.top + ")");

        // Clicking on the mdsplot should clear the selection
        mdsplot
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", mdsheight)
            .attr("width", mdswidth)
            .style("fill", color1)
            .attr("opacity", 0)
            .on("click", function() {vis_state.reset();});

        mdsplot.append("line") // draw x-axis
            .attr("x1", 0)
            .attr("x2", mdswidth)
            .attr("y1", mdsheight / 2)
            .attr("y2", mdsheight / 2)
            .attr("stroke", "gray")
            .attr("opacity", 0.3);
        mdsplot.append("text") // label x-axis
            .attr("x", 0)
            .attr("y", mdsheight/2 - 5)
            .text(data['plot.opts'].xlab)
            .attr("fill", "gray");

        mdsplot.append("line") // draw y-axis
            .attr("x1", mdswidth / 2)
            .attr("x2", mdswidth / 2)
            .attr("y1", 0)
            .attr("y2", mdsheight)
            .attr("stroke", "gray")
            .attr("opacity", 0.3);
        mdsplot.append("text") // label y-axis
            .attr("x", mdswidth/2 + 5)
            .attr("y", 7)
            .text(data['plot.opts'].ylab)
            .attr("fill", "gray");

        // new definitions based on fixing the sum of the areas of the default topic circles:
        var newSmall = Math.sqrt(0.02*mdsarea*circle_prop/Math.PI);
        var newMedium = Math.sqrt(0.05*mdsarea*circle_prop/Math.PI);
        var newLarge = Math.sqrt(0.10*mdsarea*circle_prop/Math.PI);
        var cx = 10 + newLarge,
            cx2 = cx + 1.5 * newLarge;

        // circle guide inspired from
        // http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
        var circleGuide = function(rSize, size) {
            d3.select("#" + leftPanelID).append("circle")
                .attr('class', "circleGuide" + size)
                .attr('r', rSize)
                .attr('cx', cx)
                .attr('cy', mdsheight + rSize)
                .style('fill', 'none')
                .style('stroke-dasharray', '2 2')
                .style('stroke', '#999');
            d3.select("#" + leftPanelID).append("line")
                .attr('class', "lineGuide" + size)
                .attr("x1", cx)
                .attr("x2", cx2)
                .attr("y1", mdsheight + 2 * rSize)
                .attr("y2", mdsheight + 2 * rSize)
                .style("stroke", "gray")
                .style("opacity", 0.3);
        };

        circleGuide(newSmall, "Small");
        circleGuide(newMedium, "Medium");
        circleGuide(newLarge, "Large");

        var defaultLabelSmall = "2%";
        var defaultLabelMedium = "5%";
        var defaultLabelLarge = "10%";

        d3.select("#" + leftPanelID)
            .append("text")
            .attr("x", 10)
            .attr("y", mdsheight - 10)
            .attr('class', "circleGuideTitle")
            .style("text-anchor", "left")
            .style("fontWeight", "bold")
            .text("Marginal topic distribtion");
        d3.select("#" + leftPanelID)
            .append("text")
            .attr("x", cx2 + 10)
            .attr("y", mdsheight + 2 * newSmall)
            .attr('class', "circleGuideLabelSmall")
            .style("text-anchor", "start")
            .text(defaultLabelSmall);
        d3.select("#" + leftPanelID)
            .append("text")
            .attr("x", cx2 + 10)
            .attr("y", mdsheight + 2 * newMedium)
            .attr('class', "circleGuideLabelMedium")
            .style("text-anchor", "start")
            .text(defaultLabelMedium);
        d3.select("#" + leftPanelID)
            .append("text")
            .attr("x", cx2 + 10)
            .attr("y", mdsheight + 2 * newLarge)
            .attr('class', "circleGuideLabelLarge")
            .style("text-anchor", "start")
            .text(defaultLabelLarge);

        // bind mdsData to the points in the left panel:
        var points = mdsplot.selectAll("points")
                .data(vis_state.get('mdsData'))
                .enter();

        // text to indicate topic
        points.append("text")
            .attr("class", "txt")
            .attr("x", function(d) {return (xScale(+d.x));})
            .attr("y", function(d) {return (yScale(+d.y) + 4);})
            .attr("stroke", "black")
            .attr("opacity", 1)
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fontWeight", 100)
            .text(function(d) {return d.topics;});

        var current_topic = 0;
        // draw circles
        points.append("circle")
            .attr("class", "dot")
            .style("opacity", 0.2)
            .style("fill", color1)
            .attr("r", function(d) {
                return (Math.sqrt((d.Freq/100)*mdswidth*mdsheight*circle_prop/Math.PI));
            })
            .attr("cx", function(d) {return (xScale(+d.x));})
            .attr("cy", function(d) {return (yScale(+d.y));})
            .attr("stroke", "black")
            .attr("id", function(d) {return (topicID + d.topics);})
            .on("mouseover", function(d) {
                current_topic = vis_state.get('topic');
                vis_state.set("topic", 0)
                    .set("tmp_topic", d.topics);
            })
            .on("click", function(d) {
                current_topic = d.topics;
                vis_state.set("tmp_topic", 0)
                    .set("topic", d.topics)
                    .save();
            })
            .on("mouseout", function(d) {
                vis_state
                    .set("tmp_topic", 0)
                    .set("topic", current_topic);
            });

        svg.append("text")
            .text("Intertopic Distance Map (via multidimensional scaling)")
            .attr("x", mdswidth/2 + margin.left)
            .attr("y", 30)
            .style("font-size", "16px")
            .style("text-anchor", "middle");

        var y = d3.scale.ordinal()
                .domain(vis_state.get('lamTopicTerms'))
                .rangeRoundBands([0, barheight], 0.15);
        var x = d3.scale.linear()
                .domain([1, d3.max(vis_state.get('lamTopicData'), function(d) {return d.Total;})])
                .range([0, barwidth])
                .nice();
        var yAxis = d3.svg.axis().scale(y);

        // Add a group for the bar chart
        var chart = svg.append("g")
                .attr("transform", "translate(" + +(mdswidth + margin.left + termwidth) + "," + 2 * margin.top + ")")
                .attr("id", barFreqsID);

        // bar chart legend/guide:
        var barguide = {"width": 100, "height": 15};
        d3.select("#" + barFreqsID).append("rect")
            .attr("x", 0)
            .attr("y", mdsheight + 10)
            .attr("height", barguide.height)
            .attr("width", barguide.width)
            .style("fill", color1)
            .attr("opacity", 0.4);
        d3.select("#" + barFreqsID).append("text")
            .attr("x", barguide.width + 5)
            .attr("y", mdsheight + 10 + barguide.height/2)
            .style("dominant-baseline", "middle")
            .text("Overall term frequency");

        d3.select("#" + barFreqsID).append("rect")
            .attr("x", 0)
            .attr("y", mdsheight + 10 + barguide.height + 5)
            .attr("height", barguide.height)
            .attr("width", barguide.width/2)
            .style("fill", color2)
            .attr("opacity", 0.8);
        d3.select("#" + barFreqsID).append("text")
            .attr("x", barguide.width/2 + 5)
            .attr("y", mdsheight + 10 + (3/2)*barguide.height + 5)
            .style("dominant-baseline", "middle")
            .text("Estimated term frequency within the selected topic");

        // footnotes:
        d3.select("#" + barFreqsID)
            .append("a")
            .attr("xlink:href", "http://vis.stanford.edu/files/2012-Termite-AVI.pdf")
            .attr("target", "_blank")
            .append("text")
            .attr("x", 0)
            .attr("y", mdsheight + 10 + (6/2)*barguide.height + 5)
            .style("dominant-baseline", "middle")
            .text("1. saliency(term w) = frequency(w) * [sum_t p(t | w) * log(p(t | w)/p(t))] for topics t; see Chuang et. al (2012)");
        d3.select("#" + barFreqsID)
            .append("a")
            .attr("xlink:href", "http://nlp.stanford.edu/events/illvi2014/papers/sievert-illvi2014.pdf")
            .attr("target", "_blank")
            .append("text")
            .attr("x", 0)
            .attr("y", mdsheight + 10 + (8/2)*barguide.height + 5)
            .style("dominant-baseline", "middle")
            .text("2. relevance(term w | topic t) = \u03BB * p(w | t) + (1 - \u03BB) * p(w | t)/p(w); see Sievert & Shirley (2014)");

        // Bind 'default' data to 'default' bar chart
        var basebars = chart.selectAll(to_select + " .bar-totals")
                .data(vis_state.get('lamTopicData'))
                .enter();

        // Draw the gray background bars defining the overall frequency of each word
        basebars
            .append("rect")
            .attr("class", "bar-totals")
            .attr("x", 0)
            .attr("y", function(d) {return y(d.Term);})
            .attr("height", y.rangeBand())
            .attr("width", function(d) {return x(d.Total);})
            .style("fill", color1)
            .attr("opacity", 0.4);

        // Add word labels to the side of each bar
        basebars
            .append("text")
            .attr("x", -5)
            .attr("class", "terms")
            .attr("y", function(d) {return y(d.Term) + 12;})
            .attr("cursor", "pointer")
            .attr("id", function(d) {return (termID + d.Term);})
            .style("text-anchor", "end") // right align text - use 'middle' for center alignment
            .text(function(d) {return d.Term;})
            .on("mouseover", function() {vis_state.set("term", this.innerHTML);})
            .on("mouseout", function() {vis_state.set("term", "").save();});

        var title = chart.append("text")
                .attr("x", barwidth/2)
                .attr("y", -30)
                .attr("class", "bubble-tool") //  set class so we can remove it when highlight_off is called
                .style("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Top-" + vis_state.get('R') + " Most Salient Terms");

        title.append("tspan")
            .attr("baseline-shift", "super")
            .attr("font-size", "12px")
            .text("(1)");

        // barchart axis adapted from http://bl.ocks.org/mbostock/1166403
        var xAxis = d3.svg.axis().scale(x)
                .orient("top")
                .tickSize(-barheight)
                .tickSubdivide(true)
                .ticks(6);

        chart.attr("class", "xaxis")
            .call(xAxis);

        // dynamically create the topic and lambda input forms at the top of the page:
        function init_forms(topicID, lambdaID, visID) {

            // create container div for topic and lambda input:
            var inputDiv = document.createElement("div");
            inputDiv.setAttribute("id", topID);
            inputDiv.setAttribute("style", "width: 1210px"); // to match the width of the main svg element
            document.getElementById(visID).appendChild(inputDiv);

            // topic input container:
            var topicDiv = document.createElement("div");
            topicDiv.setAttribute("style", "padding: 5px; background-color: #e8e8e8; display: inline-block; width: " + mdswidth + "px; height: 50px; float: left");
            inputDiv.appendChild(topicDiv);

            var topicLabel = document.createElement("label");
            topicLabel.setAttribute("for", topicID);
            topicLabel.setAttribute("style", "font-family: sans-serif; font-size: 14px");
            topicLabel.innerHTML = "Selected Topic: <span id='" + topicID + "-value'></span>";
            topicDiv.appendChild(topicLabel);

            var topicInput = document.createElement("input");
            topicInput.setAttribute("style", "width: 50px");
            topicInput.type = "text";
            topicInput.min = "0";
            topicInput.max = vis_state.get('K'); // assumes the data has already been read in
            topicInput.step = "1";
            topicInput.value = "0"; // a value of 0 indicates no topic is selected
            topicInput.id = topicID;
            topicDiv.appendChild(topicInput);

            var previous = document.createElement("button");
            previous.setAttribute("id", topicDown);
            previous.setAttribute("style", "margin-left: 5px");
            previous.innerHTML = "Previous Topic";
            topicDiv.appendChild(previous);

            var next = document.createElement("button");
            next.setAttribute("id", topicUp);
            next.setAttribute("style", "margin-left: 5px");
            next.innerHTML = "Next Topic";
            topicDiv.appendChild(next);

            var clear = document.createElement("button");
            clear.setAttribute("id", topicClear);
            clear.setAttribute("style", "margin-left: 5px");
            clear.innerHTML = "Clear Topic";
            topicDiv.appendChild(clear);

            // lambda inputs
            var lambdaDivWidth = barwidth;
            var lambdaDiv = document.createElement("div");
            lambdaDiv.setAttribute("id", lambdaInputID);
            lambdaDiv.setAttribute("style", "padding: 5px; background-color: #e8e8e8; display: inline-block; height: 50px; width: " + lambdaDivWidth + "px; float: right; margin-right: 30px");
            inputDiv.appendChild(lambdaDiv);

            var lambdaZero = document.createElement("div");
            lambdaZero.setAttribute("style", "padding: 5px; height: 20px; width: 220px; font-family: sans-serif; float: left");
            lambdaZero.setAttribute("id", lambdaZeroID);
            lambdaDiv.appendChild(lambdaZero);
            var xx = d3.select("#" + lambdaZeroID)
                    .append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .style("font-size", "14px")
                    .text("Slide to adjust relevance metric:");
            var yy = d3.select("#" + lambdaZeroID)
                    .append("text")
                    .attr("x", 125)
                    .attr("y", -5)
                    .style("font-size", "10px")
                    .style("position", "absolute")
                    .text("(2)");

            var sliderDiv = document.createElement("div");
            sliderDiv.setAttribute("id", sliderDivID);
            sliderDiv.setAttribute("style", "padding: 5px; height: 40px; width: 250px; float: right; margin-top: -5px; margin-right: 10px");
            lambdaDiv.appendChild(sliderDiv);

            var lambdaInput = document.createElement("input");
            lambdaInput.setAttribute("style", "width: 250px; margin-left: 0px; margin-right: 0px");
            lambdaInput.type = "range";
            lambdaInput.min = 0;
            lambdaInput.max = 1;
            lambdaInput.step = data['lambda.step'];
            lambdaInput.value = vis_state.get('lambda');
            lambdaInput.id = lambdaID;
            lambdaInput.setAttribute("list", "ticks"); // to enable automatic ticks (with no labels, see below)
            sliderDiv.appendChild(lambdaInput);

            var lambdaLabel = document.createElement("label");
            lambdaLabel.setAttribute("id", lambdaLabelID);
            lambdaLabel.setAttribute("for", lambdaID);
            lambdaLabel.setAttribute("style", "height: 20px; width: 60px; font-family: sans-serif; font-size: 14px; margin-left: 80px");
            lambdaLabel.innerHTML = "&#955 = <span id='" + lambdaID + "-value'>" + vis_state.get('lambda') + "</span>";
            lambdaDiv.appendChild(lambdaLabel);

            // Create the svg to contain the slider scale:
            var scaleContainer = d3.select("#" + sliderDivID).append("svg")
                    .attr("width", 250)
                    .attr("height", 25);

            var sliderScale = d3.scale.linear()
                    .domain([0, 1])
                    .range([7.5, 242.5])  // trimmed by 7.5px on each side to match the input type=range slider:
                    .nice();

            // adapted from http://bl.ocks.org/mbostock/1166403
            var sliderAxis = d3.svg.axis()
                    .scale(sliderScale)
                    .orient("bottom")
                    .tickSize(10)
                    .tickSubdivide(true)
                    .ticks(6);

            // group to contain the elements of the slider axis:
            var sliderAxisGroup = scaleContainer.append("g")
                    .attr("class", "slideraxis")
                    .attr("margin-top", "-10px")
                    .call(sliderAxis);

        }

        // function to re-order the bars (gray and red), and terms:
        function reorder_bars(increase) {
            var y = d3.scale.ordinal()
                    .domain(vis_state.get('lamTopicTerms'))
                    .rangeRoundBands([0, barheight], 0.15);
            var x = d3.scale.linear()
                    .domain([1, vis_state.get('lamTopicMax')])
                    .range([0, barwidth])
                    .nice();

            // Change Total Frequency bars
            var graybars = d3.select("#" + barFreqsID)
                    .selectAll(to_select + " .bar-totals")
                    .data(vis_state.get('lamTopicData'), function(d) {return d.Term;});

            // Change word labels
            var labels = d3.select("#" + barFreqsID)
                    .selectAll(to_select + " .terms")
                    .data(vis_state.get('lamTopicData'), function(d) {return d.Term;});

            // Create red bars (drawn over the gray ones) to signify the frequency under the selected topic
            var redbars = d3.select("#" + barFreqsID)
                    .selectAll(to_select + " .overlay")
                    .data(vis_state.get('lamTopicData'), function(d) {return d.Term;});

            // adapted from http://bl.ocks.org/mbostock/1166403
            var xAxis = d3.svg.axis().scale(x)
                    .orient("top")
                    .tickSize(-barheight)
                    .tickSubdivide(true)
                    .ticks(6);

            // New axis definition:
            var newaxis = d3.selectAll(to_select + " .xaxis");

            // define the new elements to enter:
            var graybarsEnter = graybars.enter().append("rect")
                    .attr("class", "bar-totals")
                    .attr("x", 0)
                    .attr("y", function(d) {return y(d.Term) + barheight + margin.bottom + 2 * vis_state.get('rMax');})
                    .attr("height", y.rangeBand())
                    .style("fill", color1)
                    .attr("opacity", 0.4);

            var labelsEnter = labels.enter()
                    .append("text")
                    .attr("x", -5)
                    .attr("class", "terms")
                    .attr("y", function(d) {return y(d.Term) + 12 + barheight + margin.bottom + 2 * vis_state.get('rMax');})
                    .attr("cursor", "pointer")
                    .style("text-anchor", "end")
                    .attr("id", function(d) {return (termID + d.Term);})
                    .text(function(d) {return d.Term;})
                    .on("mouseover", function() {vis_state.set("term", this.innerHTML);})
                    .on("mouseout", function() {vis_state.set("term", "").save();});

            var redbarsEnter = redbars.enter().append("rect")
                    .attr("class", "overlay")
                    .attr("x", 0)
                    .attr("y", function(d) {return y(d.Term) + barheight + margin.bottom + 2 * vis_state.get('rMax');})
                    .attr("height", y.rangeBand())
                    .style("fill", color2)
                    .attr("opacity", 0.8);


            if (increase) {
                graybarsEnter
                    .attr("width", function(d) {return x(d.Total);})
                    .transition().duration(duration)
                    .delay(duration)
                    .attr("y", function(d) {return y(d.Term);});
                labelsEnter
                    .transition().duration(duration)
                    .delay(duration)
                    .attr("y", function(d) {return y(d.Term) + 12;});
                redbarsEnter
                    .attr("width", function(d) {return x(d.Freq);})
                    .transition().duration(duration)
                    .delay(duration)
                    .attr("y", function(d) {return y(d.Term);});

                graybars.transition().duration(duration)
                    .attr("width", function(d) {return x(d.Total);})
                    .transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);});
                labels.transition().duration(duration)
                    .delay(duration)
                    .attr("y", function(d) {return y(d.Term) + 12;});
                redbars.transition().duration(duration)
                    .attr("width", function(d) {return x(d.Freq);})
                    .transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);});

                // Transition exiting rectangles to the bottom of the barchart:
                graybars.exit()
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Total);})
                    .transition().duration(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 6 + i * 18;})
                    .remove();
                labels.exit()
                    .transition().duration(duration)
                    .delay(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 18 + i * 18;})
                    .remove();
                redbars.exit()
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Freq);})
                    .transition().duration(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 6 + i * 18;})
                    .remove();
                // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
                newaxis.transition().duration(duration)
                    .call(xAxis)
                    .transition().duration(duration);
            } else {
                graybarsEnter
                    .attr("width", 100) // FIXME by looking up old width of these bars
                    .transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);})
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Total);});
                labelsEnter
                    .transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term) + 12;});
                redbarsEnter
                    .attr("width", 50) // FIXME by looking up old width of these bars
                    .transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);})
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Freq);});

                graybars.transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);})
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Total);});
                labels.transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term) + 12;});
                redbars.transition().duration(duration)
                    .attr("y", function(d) {return y(d.Term);})
                    .transition().duration(duration)
                    .attr("width", function(d) {return x(d.Freq);});

                // Transition exiting rectangles to the bottom of the barchart:
                graybars.exit()
                    .transition().duration(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 6 + i * 18 + 2 * vis_state.get('rMax');})
                    .remove();
                labels.exit()
                    .transition().duration(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 18 + i * 18 + 2 * vis_state.get('rMax');})
                    .remove();
                redbars.exit()
                    .transition().duration(duration)
                    .attr("y", function(d, i) {return barheight + margin.bottom + 6 + i * 18 + 2 * vis_state.get('rMax');})
                    .remove();

                // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
                newaxis.transition().duration(duration)
                    .transition().duration(duration)
                    .call(xAxis);
            }
        }

        //////////////////////////////////////////////////////////////////////////////

        var topic_change = function(topic, old_topic) {
            if (old_topic) {
                var old_el = vis_state.getElem('topic', old_topic);
                // go back to original opacity/fill
                old_el.style.opacity = base_opacity;
                old_el.style.fill = color1;
            }

            if (topic == 0) {
                var title = d3.selectAll(to_select + " .bubble-tool")
                        .text("Top-" + vis_state.get('R') + " Most Salient Terms");
                title.append("tspan")
                    .attr("baseline-shift", "super")
                    .attr("font-size", 12)
                    .text(1);

                // remove the red bars
                d3.selectAll(to_select + " .overlay").remove();

                var dat2 = vis_state.get('lamTopicData');

                var y = d3.scale.ordinal()
                        .domain(vis_state.get('lamTopicTerms'))
                        .rangeRoundBands([0, barheight], 0.15);
                var x = d3.scale.linear()
                        .domain([1, vis_state.get('lamTopicMax')])
                        .range([0, barwidth])
                        .nice();

                // Change Total Frequency bars
                d3.selectAll(to_select + " .bar-totals")
                    .data(dat2)
                    .attr("x", 0)
                    .attr("y", function(d) {return y(d.Term);})
                    .attr("height", y.rangeBand())
                    .attr("width", function(d) {return x(d.Total);})
                    .style("fill", color1)
                    .attr("opacity", 0.4);

                //Change word labels
                d3.selectAll(to_select + " .terms")
                    .data(dat2)
                    .attr("x", -5)
                    .attr("y", function(d) {return y(d.Term) + 12;})
                    .style("text-anchor", "end") // right align text - use 'middle' for center alignment
                    .attr("id", function(d) {return (termID + d.Term);})
                    .text(function(d) {return d.Term;});

                // adapted from http://bl.ocks.org/mbostock/1166403
                var xAxis = d3.svg.axis().scale(x)
                        .orient("top")
                        .tickSize(-barheight)
                        .tickSubdivide(true)
                        .ticks(6);

                // redraw x-axis
                d3.selectAll(to_select + " .xaxis")
                    .attr("class", "xaxis")
                    .call(xAxis);

            } else {
                var el = vis_state.getElem("topic", topic);

                // grab data bound to this element
                var d = el.__data__;
                var Freq = Math.round(d.Freq * 10) / 10;

                // change opacity and fill of the selected circle
                el.style.opacity = highlight_opacity;
                el.style.fill = color2;

                // Remove 'old' bar chart title
                var text = d3.select(to_select + " .bubble-tool");
                text.remove();

                // append text with info relevant to topic of interest
                d3.select("#" + barFreqsID)
                    .append("text")
                    .attr("x", barwidth/2)
                    .attr("y", -30)
                    .attr("class", "bubble-tool") //  set class so we can remove it when highlight_off is called
                    .style("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text("Top-" + vis_state.get('R') + " Most Relevant Terms for Topic " + topic + " (" + Freq + "% of tokens)");

                var dat3 = vis_state.get('lamTopicData');

                // scale the bars to the top R terms:
                var y = d3.scale.ordinal()
                        .domain(vis_state.get('lamTopicTerms'))
                        .rangeRoundBands([0, barheight], 0.15);
                var x = d3.scale.linear()
                        .domain([1, vis_state.get('lamTopicMax')])
                        .range([0, barwidth])
                        .nice();

                // remove the red bars if there are any:
                d3.selectAll(to_select + " .overlay").remove();

                // Change Total Frequency bars
                d3.selectAll(to_select + " .bar-totals")
                    .data(dat3)
                    .attr("x", 0)
                    .attr("y", function(d) {return y(d.Term);})
                    .attr("height", y.rangeBand())
                    .attr("width", function(d) {return x(d.Total);})
                    .style("fill", color1)
                    .attr("opacity", 0.4);

                // Change word labels
                d3.selectAll(to_select + " .terms")
                    .data(dat3)
                    .attr("x", -5)
                    .attr("y", function(d) {return y(d.Term) + 12;})
                    .attr("id", function(d) {return (termID + d.Term);})
                    .style("text-anchor", "end") // right align text - use 'middle' for center alignment
                    .text(function(d) {return d.Term;});

                // Create red bars (drawn over the gray ones) to signify the frequency under the selected topic
                d3.select("#" + barFreqsID).selectAll(to_select + " .overlay")
                    .data(dat3)
                    .enter()
                    .append("rect")
                    .attr("class", "overlay")
                    .attr("x", 0)
                    .attr("y", function(d) {return y(d.Term);})
                    .attr("height", y.rangeBand())
                    .attr("width", function(d) {return x(d.Freq);})
                    .style("fill", color2)
                    .attr("opacity", 0.8);

                // adapted from http://bl.ocks.org/mbostock/1166403
                var xAxis = d3.svg.axis().scale(x)
                        .orient("top")
                        .tickSize(-barheight)
                        .tickSubdivide(true)
                        .ticks(6);

                // redraw x-axis
                d3.selectAll(to_select + " .xaxis")
                //.attr("class", "xaxis")
                    .call(xAxis);

            }
        };
        vis_state.on("topic", topic_change);
        vis_state.on("tmp_topic", topic_change);

        vis_state.on("term", function(term, old_term) {
            if (term === "") {
                if (old_term) {
                    var old_el = vis_state.getElem("term", old_term);
                    old_el.style["fontWeight"] = "normal";
                }

                d3.selectAll(to_select + " .dot")
                    .data(vis_state.get("mdsData"))
                    .transition()
                    .attr("r", function(d) {
                        return (Math.sqrt((d.Freq/100)*mdswidth*mdsheight*circle_prop/Math.PI));
                    });

                // Change sizes of topic numbers:
                d3.selectAll(to_select + " .txt")
                    .transition()
                    .style("font-size", "11px");

                d3.select(to_select + " .circleGuideTitle")
                    .text("Marginal topic distribution");

            } else {
                var el = vis_state.getElem("term", term);
                el.style["fontWeight"] = "bold";

                var dat2 = vis_state.get('termFiltered');

                var k = dat2.length;

                var radius = [];
                for (var i = 0; i < vis_state.get('K'); ++i) {
                    radius[i] = 0;
                }
                for (i = 0; i < k; i++) {
                    radius[dat2[i].Topic - 1] = dat2[i].Freq;
                }

                var size = [];
                for (i = 0; i < vis_state.get("K"); ++i) {
                    size[i] = 0;
                }
                for (i = 0; i < k; i++) {
                    // If we want to also re-size the topic number labels, do it here
                    // 11 is the default, so leaving this as 11 won't change anything.
                    size[dat2[i].Topic - 1] = 11;
                }

                // Change size of bubbles according to the word's distribution over topics
                d3.selectAll(to_select + " .dot")
                    .data(radius)
                    .transition()
                    .attr("r", function(d) {
                        return (Math.sqrt(d*mdswidth*mdsheight*word_prop/Math.PI));
                    });

                // re-bind mdsData so we can handle multiple selection
                d3.selectAll(to_select + " .dot")
                    .data(vis_state.get('mdsData'));

                // Change sizes of topic numbers:
                d3.selectAll(to_select + " .txt")
                    .data(size)
                    .transition()
                    .style("font-size", function(d) {return +d;});

                // Alter the guide
                d3.select(to_select + " .circleGuideTitle")
                    .text("Conditional topic distribution given term = '" + term.innerHTML + "'");

            }
        });

        vis_state.load();
    }

    if (typeof data_or_file_name === 'string')
        d3.json(data_or_file_name, function(error, data) {visualize(data);});
    else
        visualize(data_or_file_name);


};
