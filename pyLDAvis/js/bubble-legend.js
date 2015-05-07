'use strict';

function BubbleLegend(parent_select, config) {
    var el = d3.select(parent_select),

        title, largeCirc, mediumCirc, smallCirc,
        largeLine, mediumLine, smallLine,
        titleTextEl, smallTextEl, mediumTextEl, largeTextEl,
        small_label = "2%", medium_label = "5%", large_label = "10%",
        height = config.height, width = config.width,
        circle_prop = config.circle_prop;

    // circle guide inspired from
    // http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html?_r=0
    function circleGuide(circ, line, size) {
        circ.attr('class', "circleGuide" + size)
            .style('fill', 'none')
            .style('stroke-dasharray', '2 2')
            .style('stroke', '#999');
        line.attr('class', "lineGuide" + size)
            .style("stroke", "gray")
            .style("opacity", 0.3);
    }

    function bubble_legend() {
        titleTextEl = el.append("text")
            .attr('class', 'bubbleGuideTitle')
            .style('text-anchor', 'left')
            .style('fontWeight', 'bold')
            .text(title);

        smallTextEl = el.append("text")
            .attr('class', 'bubbleGuidLabelSmall')
            .style('text-anchor', 'start')
            .text(small_label);

        mediumTextEl = el.append("text")
            .attr('class', "bubbleGuideLabelMedium")
            .style("text-anchor", "start")
            .text(medium_label);

        largeTextEl = el.append("text")
            .attr('class', "bubbleGuideLabelLarge")
            .style("text-anchor", "start")
            .text(large_label);

        smallCirc = el.append("circle");
        mediumCirc = el.append("circle");
        largeCirc = el.append("circle");

        smallLine = el.append("line");
        mediumLine = el.append("line");
        largeLine = el.append("line");

        circleGuide(smallCirc, smallLine, "Small");
        circleGuide(mediumCirc, mediumLine, "Medium");
        circleGuide(largeCirc, largeLine, "Large");
        //console.log('--- smallCirc', smallCirc);

        bubble_legend.layout();
    }

    bubble_legend.layout = function() {
        var area = width * height,

            // new definitions based on fixing the sum of the areas of the default topic circles:
            newSmall = Math.sqrt(0.02*area*circle_prop/Math.PI),
            newMedium = Math.sqrt(0.05*area*circle_prop/Math.PI),
            newLarge = Math.sqrt(0.10*area*circle_prop/Math.PI),

            cx = 10 + newLarge,
            cx2 = cx + 1.5 * newLarge;

        titleTextEl.attr("x", 10).attr("y", height - 10);
        smallTextEl.attr("x", cx2 + 10).attr("y", height + 2 * newSmall);
        mediumTextEl.attr("x", cx2 + 10).attr("y", height + 2 * newMedium);
        largeTextEl.attr("x", cx2 + 10).attr("y", height + 2 * newLarge);

        smallCirc.attr('r', newSmall).attr('cx', cx).attr('cy', height + newSmall);
        mediumCirc.attr('r', newMedium).attr('cx', cx).attr('cy', height + newMedium);
        largeCirc.attr('r', newLarge).attr('cx', cx).attr('cy', height + newLarge);

        smallLine.attr('x1', cx)
            .attr('x2', cx2)
            .attr('y1', height + 2 * newSmall)
            .attr('y2', height + 2 * newSmall);

        mediumLine.attr('x1', cx)
            .attr('x2', cx2)
            .attr('y1', height + 2 * newMedium)
            .attr('y2', height + 2 * newMedium);

        largeLine.attr('x1', cx)
            .attr('x2', cx2)
            .attr('y1', height + 2 * newLarge)
            .attr('y2', height + 2 * newLarge);

    };

    bubble_legend.title = function(v) {
        if (!arguments.length) return title;
        title = v;
        titleTextEl.text(title);
        return bubble_legend;
    };

    bubble_legend.width = function(v) {
        if (!arguments.length) return width;
        width = v;
        bubble_legend.layout();
        return bubble_legend;
    };

    bubble_legend.height = function(v) {
        if (!arguments.length) return height;
        height = v;
        bubble_legend.layout();
        return bubble_legend;
    };

    return bubble_legend;
}
