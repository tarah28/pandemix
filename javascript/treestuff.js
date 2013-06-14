"use strict";

var treestuff = {}; //object for holding all variables and functions

treestuff.width = 400;
treestuff.height = 500;
treestuff.marginForLabels = 100;
treestuff.frameData = [];
treestuff.counter = 0;
treestuff.focusedFrame = 0;


treestuff.initializeTree = function(filename) {
    d3.json(filename, function(root) { //root is the root node of the input tree
        treestuff.focusedFrame = treestuff.counter;
        //initialize d3 cluster layout
        var cluster = d3.layout.cluster()
            .size([treestuff.height, treestuff.width - treestuff.marginForLabels])
            .separation(function() {return 1; });

        //get an array of all nodes and where they should be placed 
        //(ignoring branch lengths)
        var nodes = cluster.nodes(root);
        var linkData = cluster.links(nodes);

        treestuff.attachLinkReferences(nodes, linkData);

        var xScale = treestuff.scaleBranchLengths(nodes, treestuff.width - treestuff.marginForLabels);

        var yScale = d3.scale.linear()
            .domain([0, treestuff.height])
            .range([0, treestuff.height]);

        var brush = d3.svg.brush()
            //.x(d3.scale.linear().domain([0, width]).range([0, width]))
            .y(yScale)
            .on("brushstart", treestuff.brushstart)
            .on("brush", treestuff.brushmove)
            .on("brushend", treestuff.brushend);

        var div = d3.select("body").append("div")
            .attr("class", "svgBox");

        var svg = div.append("svg")
            .attr("id", treestuff.counter)    //append a number to later identify this svg
            .attr("width", treestuff.width)
            .attr("height", treestuff.height)
            .append("g")
            .attr("transform", "translate(35, 0)");


        var zoom = d3.behavior.zoom()
            //.x(xScale)
            .y(yScale)
            .on("zoom", treestuff.zoomed)
            .scaleExtent([1, 10]);

        treestuff.frameData.push({x: xScale, y: yScale, brush: brush, zoom: zoom});

        svg.selectAll("path.link")
            .data(linkData, treestuff.getLinkKey)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", treestuff.elbow);

        //assign node classification and position it
        svg.selectAll("g.node")
            .data(nodes, treestuff.getNodeKey)
            .enter().append("g")
            .attr("class", function(d) {
                if (d.children) {
                    if (d.depth === 0) {
                        return "root node";
                    }
                    return "inner node";
                }
                return "leaf node";
            })
             .attr("transform", function(d) { return "translate(" + (d.y) + "," + yScale(d.x) + ")"; });

        //draw root node line. It is placed inside the root nodes g so it transforms along with it.
        svg.select(".root")
           .append("path")
           .attr("class", "rootLink")
           .attr("d", function() {return "M" + 0 + "," + 0 + "h" + -20; });

        svg.selectAll(".leaf").append("text")
           .attr("dx", 8)
           .attr("dy", 3)
           .attr("text-anchor", "start")
           .text(function(d) { return d.name; });

        svg.selectAll(".leaf").append("path")
           .attr("class", "dashedLink")
           .attr("d", treestuff.dashedElbow);

        svg.append("rect")
           .attr("class", "scrollArea")
           .attr("x", treestuff.width - 60)
           .attr("y", 0)
           .attr("rx", 10)
           .attr("ry", 10)
           .attr("width", 20)
           .attr("height", treestuff.height)
           .call(zoom);

        svg.append("rect")
           .attr("width", treestuff.width - treestuff.marginForLabels)
           .attr("height", treestuff.height)
           .attr("class", "brushBox")
           .call(brush);

        treestuff.counter += 1;
    });
};


treestuff.attachLinkReferences = function(nodes, linkData) {
    var i, j;
    for (i = 1; i < nodes.length; i += 1) {
        for (j = 0; j < linkData.length; j += 1) { //can this be done a bit faster?
            if (nodes[i] === linkData[j].target) {
                nodes[i].uplink = linkData[j];
                break;
            }
        }
    }
};


treestuff.getNodeLinks = function(nodes) {
    var links = [],
        i;
    for (i = 0; i < nodes.length; i += 1) {
        links.push(nodes[i].uplink);
    }
    return links;
};


treestuff.elbow = function(d) {
    return "M" + treestuff.frameData[treestuff.focusedFrame].x(d.source.rootDist) + "," + treestuff.frameData[treestuff.focusedFrame].y(d.source.x)
        + "V" + treestuff.frameData[treestuff.focusedFrame].y(d.target.x) + "H" + treestuff.frameData[treestuff.focusedFrame].x(d.target.rootDist);
};

treestuff.dashedElbow = function(d) {
    return "M" + 0 + "," + 0
        + "h" + (treestuff.frameData[treestuff.focusedFrame].x(d.rootDist) - d.y);
};

treestuff.scaleBranchLengths = function(nodes, w) {
    var visitPreOrder = function(root, callback) {
        var i;
        callback(root);
        if (root.children) {
            for (i = 0; i < root.children.length; i += 1) {
                visitPreOrder(root.children[i], callback);
            }
        }
    };

    visitPreOrder(nodes[0], function(node) {
        node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0);
    });

    var rootDists = nodes.map(function(n) { return n.rootDist; });
    var outScale = d3.scale.linear()
                     .domain([0, d3.max(rootDists)])
                     .range([0, w]);

    return outScale;
};


treestuff.zoomed = function() {
    treestuff.focusedFrame = this.parentNode.parentNode.id;

    var svg = d3.select(this.parentNode);

    svg.selectAll("path.link")
        .attr("d", treestuff.elbow);

    svg.selectAll("g.node")
        .attr("transform", function(d) { return "translate(" + (d.y) + "," + treestuff.frameData[treestuff.focusedFrame].y(d.x) + ")"; });
};


// Clear the previously-active brush, if any.
treestuff.brushstart = function() {
    var newFocusedFrame = this.parentNode.parentNode.id;

    if (newFocusedFrame !== treestuff.focusedFrame) {
        d3.selectAll(".highlighted").classed("highlighted", false);
        treestuff.frameData[treestuff.focusedFrame].brush.clear();
    }
    treestuff.focusedFrame = newFocusedFrame;
};

// Highlight the selected leaf links.
treestuff.brushmove = function() {
    var e = treestuff.frameData[treestuff.focusedFrame].brush.extent();
    var selectedNodes = [];
    var currentFrame = treestuff.frameData[treestuff.focusedFrame];

    d3.select(this.parentNode)
        .selectAll(".leaf")
        .each(function(d) {
            if (currentFrame.y(e[0]) < currentFrame.y(d.x) && currentFrame.y(d.x) < currentFrame.y(e[1])) {
                selectedNodes.push(d);
            }
        });


    d3.selectAll("svg")
        .selectAll(".leaf")
        .style("fill", function(d) {
            if (treestuff.containsLeaf(selectedNodes, d)) {
                return "orange";
            }
            return "#000";
        });

    treestuff.addContainingNodes(selectedNodes);

    //could make this a bit faster by saving previous selection
    d3.select(this.parentNode).selectAll("path.link").classed("highlighted", false);

    d3.select(this.parentNode).selectAll("path.link")
      .data(treestuff.getNodeLinks(selectedNodes), treestuff.getLinkKey)
      .classed("highlighted", true);
};

  // If the brush is empty, un-highlight all links.
treestuff.brushend = function() {
    if (treestuff.frameData[treestuff.focusedFrame].brush.empty()) {
        d3.select(this.parentNode)
          .selectAll(".highlighted").classed("highlighted", false);
    }
};

treestuff.addContainingNodes = function(nodes) {
    var cont = true,
        i;
    while (cont) {
        cont = false;
        for (i = 0; i < nodes.length; i += 1) {
            if (nodes[i].parent.children[0] === nodes[i]) {
                if (treestuff.contains(nodes, nodes[i].parent.children[1]) && !treestuff.contains(nodes, nodes[i].parent)) {
                    nodes.push(nodes[i].parent);    //editing array while iterating over it...
                    cont = true;
                }
            } else {
                if (treestuff.contains(nodes, nodes[i].parent.children[0]) && !treestuff.contains(nodes, nodes[i].parent)) {
                    nodes.push(nodes[i].parent);
                    cont = true;
                }
            }
        }
    }
};


treestuff.getNodeKey = function(d, i) {
    return (d.name || i);
};


treestuff.getLinkKey = function(d, i) {
    return (d.target.name || i);
};

treestuff.contains = function(a, obj) {
    var i;
    for (i = 0; i < a.length; i += 1) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
};

treestuff.containsLeaf = function(a, obj) {
    var i;
    for (i = 0; i < a.length; i += 1) {
        if (a[i].name === obj.name) {
            return true;
        }
    }
    return false;
};