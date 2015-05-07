'use strict';

function TopicBars(svg, config) {
    var chart,
        bar_freqs_rect,
        overlay_term_rect, overlay_term_text,
        estimated_term_rect, estimated_term_text,
        footnote1, footnote2,
        background_bars,
        bar_text, title,
        xAxis,
        dat2, dat3, x, y,
        graybars, labels, redbars, newaxis, graybarsEnter, labelsEnter, redbarsEnter
    ;
    var width = config.width,
        height = config.height,
        id = config.id,
        data = config.data,
        bg_color = config.bg_color,
        highlight_color = config.highlight_color,
        to_select = config.to_select,
        margin = config.margin,
        termID = config.termID,
        termwidth = 90,
        state = config.state,
        duration = 750,
        barguide = {"width": 100, "height": 15},
        title_text = "Top-" + state.get('R') + " Most Salient Terms"
    ;

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

    function topic_change(topic, old_topic) {
        // TODO most of this can move into layout
        if (topic == 0) {
            topic_bars.title("Top-" + state.get('R') + " Most Salient Terms");

            dat2 = data.filter(function(d) {return d.Category === "Default";});
            dat3 = dat2.slice(0, state.get('R'));

            y.domain(dat3.map(function(d) {return d.Term;}))
                .rangeRoundBands([0, height], 0.15);
            x.domain([1, d3.max(dat3, function(d) {return d.Total;})])
                .range([0, width])
                .nice();

            // remove the red bars
            //redbars.remove(); // TODO
            d3.selectAll(to_select + " .overlay").remove();

        } else {

            // Used to set relevance & title
            var circle = state.getElem('topic', topic);
            var d = circle.__data__;
            var Freq = Math.round(d.Freq * 10) / 10;

            topic_bars.title("Top-" + state.get('R') + " Most Relevant Terms for Topic " + topic + " (" + Freq + "% of tokens)");

            dat2 = data.filter(function(d) {return d.Category === "Topic" + topic;});

            // define relevance:
            for (var i = 0; i < dat2.length; i++) {
                dat2[i].relevance = state.get("lambda") * dat2[i].logprob +
                    (1 - state.get("lambda")) * dat2[i].loglift;
            }

            // sort by relevance:
            dat2.sort(fancysort("relevance"));
            dat3 = dat2.slice(0, state.get('R'));

            // scale the bars to the top R terms:
            y.domain(dat3.map(function(d) {return d.Term;}))
                .rangeRoundBands([0, height], 0.15);
            x.domain([1, d3.max(dat3, function(d) {return d.Total;})])
                .range([0, width])
                .nice();

            // remove the red bars if there are any:
            //redbars.remove(); // TODO
            d3.selectAll(to_select + " .overlay").remove();

            // Create red bars (drawn over the gray ones) to signify the frequency under the selected topic
            chart
                .selectAll(to_select + " .overlay")
                .data(dat3)
                .enter()
                .append("rect")
                .attr("class", "overlay")
                .attr("x", 0)
                .attr("y", function(d) {return y(d.Term);})
                .attr("height", y.rangeBand())
                .attr("width", function(d) {return x(d.Freq);})
                .style("fill", highlight_color)
                .attr("opacity", 0.8);

        }

        // Change Total Frequency bars
        d3.selectAll(to_select + " .bar-totals")
            .data(dat3)
            .attr("data-term", function(d) {return "t:" + d.Term + " y:" + y(d.Term);})
            .attr("x", 0)
            .attr("y", function(d) {
                return y(d.Term);
            })
            .attr("height", y.rangeBand())
            .attr("width", function(d) {return x(d.Total);})
            .style("fill", bg_color)
            .attr("opacity", 0.4);

        // Change word labels
        //d3.selectAll(to_select + " .terms")
        bar_text
            .data(dat3)
            .attr("x", -5)
            .attr("y", function(d) {return y(d.Term) + 12;})
            .attr("id", function(d) {return (termID + d.Term);})
            .style("text-anchor", "end") // right align text - use 'middle' for center alignment
            .text(function(d) {
                console.log('-- bar_text', d.Term);
                return d.Term;
            });

        xAxis.scale(x).tickSize(-height);

        // redraw x-axis
        d3.selectAll(to_select + " .xaxis")
            .attr("class", "xaxis")
            .call(xAxis);
    }

    function topic_bars(selection) {

        // establish layout and vars for bar chart
        console.log('---- topic_bars', data);
        dat2 = data.filter(function(d) {return d.Category === "Default";});
        dat3 = dat2.slice(0, state.get('R'));

        y = d3.scale.ordinal();
        x = d3.scale.linear();

        // Add a group for the bar chart
        chart = svg.append("g")
            .attr("id", id);

        overlay_term_rect = chart.append("rect")
            .style("fill", bg_color)
            .attr("opacity", 0.4);

        overlay_term_text = chart.append("text")
            .style("dominant-baseline", "middle")
            .text("Overall term frequency");

        estimated_term_rect = chart.append("rect")
            .style("fill", highlight_color)
            .attr("opacity", 0.8);

        estimated_term_text = chart.append("text")
            .style("dominant-baseline", "middle")
            .text("Estimated term frequency within the selected topic");

        footnote1 = chart.append("a")
            .attr("xlink:href", "http://vis.stanford.edu/files/2012-Termite-AVI.pdf")
            .attr("target", "_blank")
            .append("text")
            .style("dominant-baseline", "middle")
            .text("1. saliency(term w) = frequency(w) * [sum_t p(t | w) * log(p(t | w)/p(t))] for topics t; see Chuang et. al (2012)");

        footnote2 = chart.append("a")
            .attr("xlink:href", "http://nlp.stanford.edu/events/illvi2014/papers/sievert-illvi2014.pdf")
            .attr("target", "_blank")
            .append("text")
            .style("dominant-baseline", "middle")
            .text("2. relevance(term w | topic t) = \u03BB * p(w | t) + (1 - \u03BB) * p(w | t)/p(w); see Sievert & Shirley (2014)");

        // Bind 'default' data to 'default' bar chart
        graybars = chart.selectAll(to_select + " .bar-totals")
            .data(dat3);

        // Draw the gray background bars defining the overall frequency of each word
        background_bars = graybars.enter()
        //graybarsEnter = graybars.enter()
            .append("rect")
            .attr("class", "bar-totals")
            .style("fill", bg_color)
            .attr("opacity", 0.4);

        // Add word labels to the side of each bar
        bar_text = chart.append("text")
            .attr("class", "terms")
            .attr("cursor", "pointer")
            .style("text-anchor", "end") // right align text - use 'middle' for center alignment
            .on("mouseover", function() {state.set("term", this.innerHTML);})
            .on("mouseout", function() {state.set("term", "");});

        title = chart.append("text")
            .attr("class", "bubble-tool") //  set class so we can remove it when highlight_off is called
            .style("text-anchor", "middle")
            .style("font-size", "16px");

        // TODO
        title.append("tspan")
            .attr("baseline-shift", "super")
            .attr("font-size", "12px")
            .text("(1)");

        xAxis = d3.svg.axis()
            .orient("top")
            .tickSubdivide(true)
            .ticks(6);

        topic_bars.layout();

    }

    state.on('term', function(new_term, old_term) {
        var termElem;
        if (new_term === "") {
            termElem = state.getElem("term", old_term);
            termElem.style["fontWeight"] = "normal";
        } else {
            termElem = state.getElem("term");
            termElem.style["fontWeight"] = "bold";
        }
    });

    state.on('tmp_topic', topic_change);
    state.on('topic', topic_change);

    state.on('lambda', function(new_val, old_val) {
        var increased = old_val < new_val;
        //if (state.get("topic") > 0) topic_bars.reorder_bars(increased);
        if (state.get("topic") > 0) topic_bars.layout(increased);
    });

    topic_bars.layout = function(increase) {

        //barwidth = parseInt((width - margin.left - margin.right - termwidth)/2);
        //barheight = barwidth;
        //barwidth = width;
        //barheight = height;

        // TODO only want redbars when topic is set

        y.domain(dat3.map(function(d) {return d.Term;}))
            .rangeRoundBands([0, height], 0.15);
        x.domain([1, d3.max(dat3, function(d) {return d.Total;})])
            .range([0, width])
            .nice();

        chart.attr("transform", "translate(" + (width + margin.left + termwidth) + "," + 2 * margin.top + ")");

        overlay_term_rect
            .attr("x", 0)
            .attr("y", height + 10)
            .attr("height", barguide.height)
            .attr("width", barguide.width);

        overlay_term_text
            .attr("x", barguide.width + 5)
            .attr("y", height + 10 + barguide.height/2);

        estimated_term_rect
            .attr("x", 0)
            .attr("y", height + 10 + barguide.height + 5)
            .attr("height", barguide.height)
            .attr("width", barguide.width/2);

        estimated_term_text
            .attr("x", barguide.width/2 + 5)
            .attr("y", height + 10 + (3/2)*barguide.height + 5);

        footnote1
            .attr("x", 0)
            .attr("y", height + 10 + (6/2)*barguide.height + 5);

        footnote2
            .attr("x", 0)
            .attr("y", height + 10 + (8/2)*barguide.height + 5);

        background_bars
        //graybarsEnter
            .attr("x", 0)
            .attr("y", function(d) {return y(d.Term);})
            .attr("height", y.rangeBand())
            .attr("width", function(d) {return x(d.Total);});

        console.log('-bar_text');
        bar_text
            .data(dat3)
            .attr("x", -5)
            .attr("y", function(d) {
                console.log('-', y(d.Term) + 12);
                return y(d.Term) + 12;
            })
            .attr("id", function(d) {return (termID + d.Term);})
            .text(function(d) {
                console.log('-- bar_text', d.Term);
                return d.Term;
            });

        title
            .attr("x", width/2)
            .attr("y", -30)
            .text(title_text);

        xAxis.scale(x).tickSize(-height);

        chart.attr("class", "xaxis")
            .call(xAxis);

        // TODO below is pulled from reorder_bars

        // Change Total Frequency bars
        graybars = chart
            .selectAll(to_select + " .bar-totals")
            .data(dat3, function(d) {return d.Term;});

        // Change word labels
        labels = bar_text
            .data(dat3, function(d) {return d.Term;});

        // Create red bars (drawn over the gray ones) to signify the frequency under the selected topic
        redbars = chart
            .selectAll(to_select + " .overlay")
            .data(dat3, function(d) {return d.Term;});

        // New axis definition:
        newaxis = d3.selectAll(to_select + " .xaxis");

        // define the new elements to enter:
        graybarsEnter = graybars
            .enter()
            .append("rect")
            .attr("class", "bar-totals")
            .attr("x", 0)
            .attr("y", function(d) {
                return y(d.Term) + height + margin.bottom + 2 * state.get('rMax');
            })
            .attr("height", y.rangeBand())
            .style("fill", bg_color)
            .attr("opacity", 0.4);

        labelsEnter = labels.enter()
            .append("text")
            .attr("x", -5)
            .attr("class", "terms") // bar_text
            .attr("y", function(d) {
                return y(d.Term) + 12 + height + margin.bottom + 2 * state.get('rMax');
            })
            .attr("cursor", "pointer")
            .style("text-anchor", "end")
            .attr("id", function(d) {return (termID + d.Term);})
            .text(function(d) {return d.Term;})
            .on("mouseover", function() {state.set("term", this.innerHTML);})
            .on("mouseout", function() {state.set("term", "");});

        redbarsEnter = redbars
            //.data(dat3)
            .enter().append("rect")
            .attr("class", "overlay")
            .attr("x", 0)
            .attr("y", function(d) {
                return y(d.Term) + height + margin.bottom + 2 * state.get('rMax');
            })
            .attr("height", y.rangeBand())
            .style("fill", highlight_color)
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
                .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18;})
                .remove();
            labels.exit()
                .transition().duration(duration)
                .delay(duration)
                .attr("y", function(d, i) {return height + margin.bottom + 18 + i * 18;})
                .remove();
            redbars.exit()
                .transition().duration(duration)
                .attr("width", function(d) {return x(d.Freq);})
                .transition().duration(duration)
                .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18;})
                .remove();
            // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
            newaxis.transition()
                .duration(duration)
                .call(xAxis)
                .transition()
                .duration(duration);
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
                .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18 + 2 * state.get('rMax');})
                .remove();
            labels.exit()
                .transition().duration(duration)
                .attr("y", function(d, i) {return height + margin.bottom + 18 + i * 18 + 2 * state.get('rMax');})
                .remove();
            redbars.exit()
                .transition().duration(duration)
                .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18 + 2 * state.get('rMax');})
                .remove();

            // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
            newaxis.transition()
                .duration(duration)
                .transition()
                .duration(duration)
                .call(xAxis);
        }

    };

    topic_bars.title = function(v) {
        if (!arguments.length) return title_text;
        title_text = v;

        // TODO Why is it removed & added again???

        // Remove 'old' bar chart title
        title.remove();

        // append text with info relevant to topic of interest
        title = chart.append("text")
            .attr("x", width/2)
            .attr("y", -30)
            .attr("class", "bubble-tool") //  set class so we can remove it when highlight_off is called
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .text(title_text);

        return topic_bars;
    };

    topic_bars.reorder_bars = function(increase) {
        // TODO why can't layout accomplish this??

        // dat2 = data.filter(function(d) {return d.Category === "Topic" + state.get('topic');});
        // for (var i = 0; i < dat2.length; i++) {
        //     dat2[i].relevance = state.get('lambda') * dat2[i].logprob +
        //         (1 - state.get('lambda')) * dat2[i].loglift;
        // }

        // dat2.sort(fancysort("relevance"));
        // dat3 = dat2.slice(0, state.get('R'));

        // y.domain(dat3.map(function(d) {return d.Term;}))
        //     .rangeRoundBands([0, height], 0.15);
        // x.domain([1, d3.max(dat3, function(d) {return d.Total;})])
        //     .range([0, width])
        //     .nice();

        // // Change Total Frequency bars
        // graybars = chart
        //     .selectAll(to_select + " .bar-totals")
        //     .data(dat3, function(d) {return d.Term;});

        // // Change word labels
        // labels = bar_text
        //     .data(dat3, function(d) {return d.Term;});

        // // Create red bars (drawn over the gray ones) to signify the frequency under the selected topic
        // redbars = chart
        //     .selectAll(to_select + " .overlay")
        //     .data(dat3, function(d) {return d.Term;});

        // xAxis.scale(x).tickSize(-height);

        // // New axis definition:
        // newaxis = d3.selectAll(to_select + " .xaxis");

        // // define the new elements to enter:
        // graybarsEnter = graybars
        //     .enter()
        //     .append("rect")
        //     .attr("class", "bar-totals")
        //     .attr("x", 0)
        //     .attr("y", function(d) {
        //         return y(d.Term) + height + margin.bottom + 2 * state.get('rMax');
        //     })
        //     .attr("height", y.rangeBand())
        //     .style("fill", bg_color)
        //     .attr("opacity", 0.4);

        // labelsEnter = labels.enter()
        //     .append("text")
        //     .attr("x", -5)
        //     .attr("class", "terms") // bar_text
        //     .attr("y", function(d) {
        //         return y(d.Term) + 12 + height + margin.bottom + 2 * state.get('rMax');
        //     })
        //     .attr("cursor", "pointer")
        //     .style("text-anchor", "end")
        //     .attr("id", function(d) {return (termID + d.Term);})
        //     .text(function(d) {return d.Term;})
        //     .on("mouseover", function() {state.set("term", this.innerHTML);})
        //     .on("mouseout", function() {state.set("term", "");});

        // redbarsEnter = redbars.enter().append("rect")
        //     .attr("class", "overlay")
        //     .attr("x", 0)
        //     .attr("y", function(d) {
        //         return y(d.Term) + height + margin.bottom + 2 * state.get('rMax');
        //     })
        //     .attr("height", y.rangeBand())
        //     .style("fill", highlight_color)
        //     .attr("opacity", 0.8);

        // if (increase) {
        //     graybarsEnter
        //         .attr("width", function(d) {return x(d.Total);})
        //         .transition().duration(duration)
        //         .delay(duration)
        //         .attr("y", function(d) {return y(d.Term);});
        //     labelsEnter
        //         .transition().duration(duration)
        //         .delay(duration)
        //         .attr("y", function(d) {return y(d.Term) + 12;});
        //     redbarsEnter
        //         .attr("width", function(d) {return x(d.Freq);})
        //         .transition().duration(duration)
        //         .delay(duration)
        //         .attr("y", function(d) {return y(d.Term);});

        //     graybars.transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Total);})
        //         .transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);});
        //     labels.transition().duration(duration)
        //         .delay(duration)
        //         .attr("y", function(d) {return y(d.Term) + 12;});
        //     redbars.transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Freq);})
        //         .transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);});

        //     // Transition exiting rectangles to the bottom of the barchart:
        //     graybars.exit()
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Total);})
        //         .transition().duration(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18;})
        //         .remove();
        //     labels.exit()
        //         .transition().duration(duration)
        //         .delay(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 18 + i * 18;})
        //         .remove();
        //     redbars.exit()
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Freq);})
        //         .transition().duration(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18;})
        //         .remove();
        //     // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
        //     newaxis.transition()
        //         .duration(duration)
        //         .call(xAxis)
        //         .transition()
        //         .duration(duration);
        // } else {
        //     graybarsEnter
        //         .attr("width", 100) // FIXME by looking up old width of these bars
        //         .transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);})
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Total);});
        //     labelsEnter
        //         .transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term) + 12;});
        //     redbarsEnter
        //         .attr("width", 50) // FIXME by looking up old width of these bars
        //         .transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);})
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Freq);});

        //     graybars.transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);})
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Total);});
        //     labels.transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term) + 12;});
        //     redbars.transition().duration(duration)
        //         .attr("y", function(d) {return y(d.Term);})
        //         .transition().duration(duration)
        //         .attr("width", function(d) {return x(d.Freq);});

        //     // Transition exiting rectangles to the bottom of the barchart:
        //     graybars.exit()
        //         .transition().duration(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18 + 2 * state.get('rMax');})
        //         .remove();
        //     labels.exit()
        //         .transition().duration(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 18 + i * 18 + 2 * state.get('rMax');})
        //         .remove();
        //     redbars.exit()
        //         .transition().duration(duration)
        //         .attr("y", function(d, i) {return height + margin.bottom + 6 + i * 18 + 2 * state.get('rMax');})
        //         .remove();

        //     // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
        //     newaxis.transition()
        //         .duration(duration)
        //         .transition()
        //         .duration(duration)
        //         .call(xAxis);
        // }
    };

    topic_bars.height = function(v) {
        if (!arguments.length) return height;
        height = v;
        return topic_bars;
    };

    topic_bars.width = function(v) {
        if (!arguments.length) return width;
        width = v;
        return topic_bars;
    };

    return topic_bars;
}
