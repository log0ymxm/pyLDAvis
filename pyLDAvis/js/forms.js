'use strict';

function Forms(config) {
    // dynamically create the topic and lambda input forms at the top of the page:

    // Create the topic input & lambda slider forms. Inspired from:
    // http://bl.ocks.org/d3noob/10632804
    // http://bl.ocks.org/d3noob/10633704

    var clear,
        data = config.data,
        lambdaInput, lambdaLabel, lambdaZero,
        mdswidth = config.mdswidth,
        topicbars = config.topicbars,
        termID = config.termID,
        to_select = config.to_select,
        topicID = config.topicID,
        visID = config.visID,
        width = config.width,
        height = config.height,
        barwidth, inputDiv, lambdaDiv, lambdaDivWidth, next,
        previous, scaleContainer, sliderAxis, sliderAxisGroup,
        sliderDiv, sliderScale, topicDiv, topicInput,
        topicLabel, xx, yy, lambdaSpan;

    var lambdaID = visID + "-lambda";
    var topicDown = topicID + "-down";
    var topicUp = topicID + "-up";
    var topicClear = topicID + "-clear";
    var topID = visID + "-top";
    var sliderDivID = visID + "-sliderdiv";
    var state = config.state;

    state.on('lambda', function(lambda) {
        lambdaInput.value = lambda;
        lambdaSpan.innerHTML = lambda;
    });

    state.on('topic', function(topic) {
        topicInput.value = topic;
    });

    function forms(selection) {

        // create container div for topic and lambda input:
        inputDiv = document.createElement("div");
        inputDiv.setAttribute("id", topID);
        // TODO avoid getElementbyid
        document.getElementById(visID).appendChild(inputDiv);

        // topic input container:
        topicDiv = document.createElement("div");
        inputDiv.appendChild(topicDiv);

        topicLabel = document.createElement("label");
        topicLabel.setAttribute("for", topicID);
        topicLabel.innerHTML = "Selected Topic: ";
        topicDiv.appendChild(topicLabel);

        topicInput = document.createElement("input");
        topicInput.type = "text";
        topicInput.min = "0";
        topicInput.max = state.get('K'); // assumes the data has already been read in
        topicInput.step = "1";
        topicInput.value = "0"; // a value of 0 indicates no topic is selected
        topicInput.id = topicID;
        topicDiv.appendChild(topicInput);

        previous = document.createElement("button");
        previous.setAttribute("id", topicDown);
        previous.innerHTML = "Previous Topic";
        topicDiv.appendChild(previous);

        next = document.createElement("button");
        next.setAttribute("id", topicUp);
        next.innerHTML = "Next Topic";
        topicDiv.appendChild(next);

        clear = document.createElement("button");
        clear.setAttribute("id", topicClear);
        clear.innerHTML = "Clear Topic";
        topicDiv.appendChild(clear);

        // lambda inputs
        lambdaDivWidth = barwidth;
        lambdaDiv = document.createElement("div");
        inputDiv.appendChild(lambdaDiv);

        lambdaZero = document.createElement("div");
        lambdaDiv.appendChild(lambdaZero);

        xx = d3.select(lambdaZero)
            .append("text")
            .text("Slide to adjust relevance metric:");
        yy = d3.select(lambdaZero)
            .append("text")
            .style("position", "absolute")
            .text("(2)");

        sliderDiv = document.createElement("div");
        sliderDiv.setAttribute("id", sliderDivID);
        lambdaDiv.appendChild(sliderDiv);

        lambdaInput = document.createElement("input");
        lambdaInput.type = "range";
        lambdaInput.min = 0;
        lambdaInput.max = 1;
        lambdaInput.step = data['lambda.step']; // TODO
        lambdaInput.id = lambdaID;
        lambdaInput.setAttribute("list", "ticks"); // to enable automatic ticks (with no labels, see below)
        sliderDiv.appendChild(lambdaInput);

        lambdaSpan = document.createElement("span");
        lambdaSpan.id = lambdaID + "-value";

        lambdaLabel = document.createElement("label");
        lambdaLabel.setAttribute("for", lambdaID);
        lambdaLabel.appendChild(lambdaSpan);
        lambdaLabel.insertAdjacentHTML("afterbegin", "&#955 = ");
        lambdaDiv.appendChild(lambdaLabel);

        // Create the svg to contain the slider scale:
        scaleContainer = d3.select("#" + sliderDivID).append("svg");

        sliderScale = d3.scale.linear()
            .domain([0, 1])
            .range([7.5, 242.5])  // trimmed by 7.5px on each side to match the input type=range slider:
            .nice();

        // adapted from http://bl.ocks.org/mbostock/1166403
        sliderAxis = d3.svg.axis()
            .scale(sliderScale)
            .orient("bottom")
            .tickSize(10)
            .tickSubdivide(true)
            .ticks(6);

        // group to contain the elements of the slider axis:
        sliderAxisGroup = scaleContainer.append("g")
            .attr("class", "slideraxis")
            .call(sliderAxis);

        // When the value of lambda changes, update the visualization
        d3.select(lambdaInput).on("mouseup", function() {
            console.log('--- lambdaInput mouseup', this.value, this);
            state.set("lambda", +this.value);
        });
        d3.select(next).on("click", function() {
            state
                .set("topic", state.get("topic") + 1)
                .set("term", "");
        });
        d3.select(previous).on("click", function() {
            state
                .set("topic", state.get("topic") - 1)
                .set("term", "");
        });
        d3.select(topicInput).on("keyup", function() {
            state
                .set("topic", this.value)
                .set("term", "");
        });
        d3.select(clear).on("click", function() {state.reset();});

        forms.layout();
    }

    forms.layout = function() {
        inputDiv.setAttribute("style", "width: "+ width +"px"); // to match the width of the main svg element

        topicDiv.setAttribute("style", "padding: 5px; background-color: #e8e8e8; display: inline-block; width: " + mdswidth + "px; height: 50px; float: left; box-sizing: border-box;");

        topicLabel.setAttribute("style", "font-family: sans-serif; font-size: 14px");

        topicInput.setAttribute("style", "width: 50px");

        previous.setAttribute("style", "margin-left: 5px");

        next.setAttribute("style", "margin-left: 5px");

        clear.setAttribute("style", "margin-left: 5px");

        lambdaDiv.setAttribute("style", "padding: 5px; background-color: #e8e8e8; display: inline-block; height: 50px; width: " + lambdaDivWidth + "px; float: right; margin-right: 30px; box-sizing: border-box;");

        lambdaZero.setAttribute("style", "padding: 5px; height: 20px; width: 220px; font-family: sans-serif; float: left");

        xx
            .attr("x", 0)
            .attr("y", 0)
            .style("font-size", "14px");

        yy
            .attr("x", 125)
            .attr("y", -5)
            .style("font-size", "10px");

        sliderDiv.setAttribute("style", "padding: 5px; height: 40px; width: 250px; float: right; margin-top: -5px; margin-right: 10px");

        lambdaInput.setAttribute("style", "width: 250px; margin-left: 0px; margin-right: 0px");

        lambdaLabel.setAttribute("style", "height: 20px; width: 60px; font-family: sans-serif; font-size: 14px; margin-left: 80px");

        scaleContainer.attr("width", 250).attr("height", 25);

        sliderAxisGroup.attr("margin-top", "-10px");
    };

    forms.height = function(v) {
        if (!arguments.length) return height;
        height = v;
        return forms;
    };

    forms.width = function(v) {
        if (!arguments.length) return width;
        width = v;
        return forms;
    };

    return forms;
}
