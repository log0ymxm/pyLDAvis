'use strict';

function BubbleChart(svg, config) {
    var margin = config.margin,
        bg_color = config.bg_color,
        highlight_color = config.highlight_color,
        mdsplot, mds_rect,
        mds_x_line, mds_x_text, mds_y_line, mds_y_text,
        x_label = config.x_label, y_label = config.y_label,
        legend, points, points_text, points_circle,
        height = config.height, width = config.width,
        title,
        topicID = config.topicID,
        visID = config.visID,
        lamData = config.lamData,
        barheight = config.barheight,
        barwidth = config.barwidth,
        to_select = config.to_select, // TODO don't require this
        termID = config.termID,
        mdsData3 = config.mdsData3
    ;
    var id = visID + "-leftpanel";
    var data = config.data; // TODO
    var state = config.state;
    var current_topic = 0; // Allows us to save topic with mouseover changing the tmp_topic

    // opacity of topic circles:
    var base_opacity = 0.2,
        highlight_opacity = 0.6;

    // proportion of area of MDS plot to which the sum of default topic circle areas is set
    var circle_prop = 0.25;
    var word_prop = 0.25;
    var circle;

    // TODO
    state.on('term', function(term, old_term) {
        if (term === "") {
            // TODO do term off stuff
        } else {
            // TODO do term on stuff
        }
    });

    // TODO
    state.on('topic', function(topic, old_topic) {
        if (topic == 0) {
            // go back to original opacity/fill
            circle = state.getElem('topic', old_topic);
            circle.style.opacity = base_opacity;
            circle.style.fill = bg_color;

        } else {
            // change opacity and fill of the selected circle
            circle = state.getElem('topic');
            circle.style.opacity = highlight_opacity;
            circle.style.fill = highlight_color;

        }
    });

    state.on('tmp_topic', function(topic, old_topic) {
        if (topic == 0) {
            circle = state.getElem('topic', old_topic);
            circle.style.opacity = base_opacity;
            circle.style.fill = bg_color;
        } else {
            circle = state.getElem('topic', topic);
            console.log('--- circle', circle);
            circle.style.opacity = highlight_opacity;
            circle.style.fill = highlight_color;
        }
    });

    function bubble_chart(selection) {

        // Create a group for the mds plot
        mdsplot = svg.append("g")
            .attr("id", id)
            .attr("class", "points")
            .attr("transform", "translate(" + margin.left + "," + 2 * margin.top + ")");

        // Clicking on the mdsplot should clear the selection
        mds_rect = mdsplot.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .style("fill", bg_color)
            .attr("opacity", 0)
            .on("click", function() {state.reset();});

        mds_x_line = mdsplot.append("line").attr("stroke", "gray").attr("opacity", 0.3);
        mds_x_text = mdsplot.append("text").text(x_label).attr("fill", "gray");
        mds_y_line = mdsplot.append("line").attr("stroke", "gray").attr("opacity", 0.3);
        mds_y_text = mdsplot.append("text").text(y_label).attr("fill", "gray");

        //console.log('--- legend', height, width);
        legend = BubbleLegend("#" + id, {
            height: height,
            width: width,
            circle_prop: circle_prop
        });
        legend(); // TODO would normally be done by a d3.select().data().call(bubbleLegend)
        legend.title("Marginal topic distribution"); // TODO setter legend_title

        // bind mdsData to the points in the left panel:
        //console.log('points data', data);
        points = mdsplot.selectAll("points")
            .data(data) // TODO
            .enter();

        // text to indicate topic
        points_text = points.append("text")
            .attr("class", "txt")
            .attr("stroke", "black")
            .attr("opacity", 1)
            .style("text-anchor", "middle")
            .style("font-size", "11px") // TODO may want to adjust on resize
            .style("fontWeight", 100)
            .text(function(d) {return d.topics;});

        // draw circles
        points_circle = points.append("circle")
            .attr("class", "dot")
            .style("opacity", 0.2)
            .style("fill", bg_color)
            .attr("stroke", "black")
            .attr("id", function(d) {return (topicID + d.topics);})
            .on("mouseover", function(d) {
                console.log('--- mouseover', current_topic);
                current_topic = state.get('topic');
                state.set('topic', 0)
                    .set('tmp_topic', d.topics);
            })
            .on("click", function(d) {
                // prevent click event defined on the div container from firing
                // http://bl.ocks.org/jasondavies/3186840
                d3.event.stopPropagation();
                console.log('--- click', current_topic);

                current_topic = d.topics;
                state.set('tmp_topic', 0)
                    .set('topic', d.topics);
            })
            .on("mouseout", function(d) {
                console.log('--- mouseout', current_topic);
                state.set('tmp_topic', 0)
                    .set('topic', current_topic);
            });

        title = svg.append("text")
            .text("Intertopic Distance Map (via multidimensional scaling)")
            .style("font-size", "16px") // TODO may want to adjust with window size
            .style("text-anchor", "middle");

        // TODO
        //selection.each(function(d,i) {
        //    // TODO
        //});

        bubble_chart.layout();
    }

    bubble_chart.layout = function() {

        mds_rect
            .attr("height", height)
            .attr("width", width);

        mds_x_line
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", height / 2)
            .attr("y2", height / 2);

        mds_x_text
            .attr("x", 0)
            .attr("y", height/2 - 5);

        mds_y_line
            .attr("x1", width / 2)
            .attr("x2", width / 2)
            .attr("y1", 0)
            .attr("y2", height);

        mds_y_text
            .attr("x", width/2 + 5)
            .attr("y", 7);

        legend.layout();

        // create linear scaling to pixels (and add some padding on outer region of scatterplot)
        var xrange = d3.extent(data, function(d) {
            return d.x;
        }); //d3.extent returns min and max of an array
        var xdiff = xrange[1] - xrange[0];
        var xpad = 0.05;
        var yrange = d3.extent(data, function(d) {
            return d.y;
        });
        var ydiff = yrange[1] - yrange[0];
        var ypad = 0.05;


        var x_domain, y_domain;
        if (xdiff > ydiff) {
            x_domain = [xrange[0] - xpad * xdiff, xrange[1] + xpad * xdiff];
            y_domain = [yrange[0] - 0.5*(xdiff - ydiff) - ypad*xdiff, yrange[1] + 0.5*(xdiff - ydiff) + ypad*xdiff];
        } else {
            x_domain = [xrange[0] - 0.5*(ydiff - xdiff) - xpad*ydiff, xrange[1] + 0.5*(ydiff - xdiff) + xpad*ydiff];
            y_domain = [yrange[0] - ypad * ydiff, yrange[1] + ypad * ydiff];
        }

        var xScale = d3.scale.linear()
            .range([0, width])
            .domain(x_domain);

        var yScale = d3.scale.linear()
            .range([height, 0])
            .domain(y_domain);

        points_text
            .attr("x", function(d) {return (xScale(+d.x));})
            .attr("y", function(d) {return (yScale(+d.y) + 4);});

        points_circle
            .attr("r", function(d) {
                return (Math.sqrt((d.Freq/100) * width * height * circle_prop / Math.PI));
            })
            .attr("cx", function(d) {return (xScale(+d.x));})
            .attr("cy", function(d) {return (yScale(+d.y));});

        title
            .attr("x", width/2 + margin.left)
            .attr("y", 30);

    };

    bubble_chart.legend = function(v) {
        if (!arguments.length) return legend;
        legend = v;
        return bubble_chart;
    };

    bubble_chart.topic_off = function(circle) {
        if (circle == null) return bubble_chart;

        topic_off_fn(circle);

        return bubble_chart;
    };

    bubble_chart.height = function(v) {
        if (!arguments.length) return height;
        height = v;
        return bubble_chart;
    };

    bubble_chart.width = function(v) {
        if (!arguments.length) return width;
        width = v;
        return bubble_chart;
    };

    bubble_chart.set_term = function(term) {
        // TODO TODO state.on('term')
        var d = term.__data__;
        var Term = d.Term;
        var dat2 = mdsData3.filter(function(d2) {
            return d2.Term === Term;
        });

        var k = dat2.length; // number of topics for this token with non-zero frequency

        var radius = [];
        for (var i = 0; i < state.get('K'); ++i) {
            radius[i] = 0;
        }
        for (i = 0; i < k; i++) {
            radius[dat2[i].Topic - 1] = dat2[i].Freq;
        }

        var size = [];
        for (i = 0; i < state.get('K'); ++i) {
            size[i] = 0;
        }
        for (i = 0; i < k; i++) {
            // If we want to also re-size the topic number labels, do it here
            // 11 is the default, so leaving this as 11 won't change anything.
            size[dat2[i].Topic - 1] = 11;
        }

        var rScaleCond = d3.scale.sqrt()
                .domain([0, 1]).range([0, state.get('rMax')]); // TODO layout

        // Change size of bubbles according to the word's distribution over topics
        points_circle
            .data(radius)
            .transition()
            .attr("r", function(d) {
                //return (rScaleCond(d));
                return (Math.sqrt(d*width*height*word_prop/Math.PI));
            });

        // re-bind mdsData so we can handle multiple selection
        points_circle
            .data(data);

        // Change sizes of topic numbers:
        points_text
            .data(size)
            .transition()
            .style("font-size", function(d) {return +d;});

        // Alter the guide
        bubble_chart.legend()
            .title("Conditional topic distribution given term = '" + term.innerHTML + "'");

        return bubble_chart;
    };

    bubble_chart.clear_term = function() {
        // TODO state.on('term')
        // term === ""

        points_circle.data(data) // TODO need to make sure data stays updated
            .transition()
            .attr("r", function(d) {
                return (Math.sqrt((d.Freq/100)*width*height*circle_prop/Math.PI));
            });

        // Change sizes of topic numbers:
        points_text.transition()
            .style("font-size", "11px");

        // Go back to the default guide
        bubble_chart.legend()
            .title("Marginal topic distribution")
            .height(height)
            .width(width);

        return bubble_chart;
    };

    return bubble_chart;
}
