// Written by Mitchell Bourke
/*
Copyright (c) 2019, Mitchell Bourke, mitchell@bourkey.com
All rights reserved.
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
either expressed or implied, of the <project name> project.
*/

/*
    Done
        Keywords
            Strings
            If 
            Else
            elif, else if
            switch
            
        Need to correctly recognise } and { in strings
        Need to track the current parent
        Handle nesting correctly(recusive calling) need to only parse the outer most set of parathenses at each iteration
        
    Todo
        fix issue with } finder overshooting and then going backwards
        Allow for nodes with the same name without joining them into 1(mabye make this toggleable)
        Implement the following keywords            
            
            subgraphs, possibly using keyword "sub"
            for
            while
            Ability to set color, border, fill, orientation ect of nodes
*/

function CreateSVG(data, img){    
    let svg = Viz(data, "svg");
    
    if (img == false || img == undefined){
        return svg;
    } else {
        if (typeof img == 'string'){
            document.getElementById(img).innerHTML = svg;
        } else {
            img.innerHTML = svg;
        }
        return true;
    }
}

//Called with flowchart code as an argument and returns 
function ParseCode(text, parent=[], nodes=[], connections = [], iter=0, indent=0){//Chunks contains [type, title/condition, body]    
    //Increment the indentation level once for each time the function is recalled(we recall the function once for each block of code)
    indent += 1;
    
    //Parent is the index of the nodes that the current block is under
    //Nodes is an array of nodes where each node is a dict containing the following fields 'text', 'shape', 'orientation', 'sides'(only if shape=polygon), color(0-1,0-1,0-1), style(solid, dotted, filled)    
    //Array of connections between nodes where each entry is a dict with the following keys 'parent', 'child', 'label', color(0-1, 0-1, 0-1)
    
    //Define regex to parse keywords
    let regex = /(else if|elif|if|switch|while|case) {0,1}\((.+?)\) ?\{|\}? ?(else) ?\{|"(.+?)";?|'(.+?)';?|`(.+?)`;?|([a-zA-Z0-9 ]+?);/s
    
    //Define a variable to track the position in the string
    let pos = 0;
    while (pos < text.length){
        //Increment the number of iterations by 1
        iter += 1;
        
        //If iterations reaches 10k assume the program is in an infinite loop and abort
        if (iter > 100){
            break;
        }
        
        const subtext = text.slice(pos);
        let result = regex.exec(subtext);
        
        if (result != null){
            //Find the start position of the first regex match
            let start = result.index;     
            
            //Now we need to work out what kind of match this is
            //If this is a string token
            if (typeof result[1] == 'undefined' && result[3] != 'else'){    
                //Define a variable that we will load the string into
                let strval = '';
                
                if (typeof result[4] != 'undefined'){                    
                    strval = result[4];
                    
                } else if (typeof result[5] != 'undefined'){
                     strval = result[5];
                    
                } else if (typeof result[6] != 'undefined'){
                    strval = result[6];
                    
                } else if (typeof result[7] != 'undefined'){
                    strval = result[7];
                    
                } else {
                    console.log(result);
                    console.warn('Unrecognised variable format');
                    return [[], []];
                }          
                
                //Just add the start and length together to get the next position for string tokens
                pos = pos + start + result[0].length;
                
                console.log('String:', strval);
                
                //Add the string to nodes and return the index
                const nodeindex = nodes.push({'text': strval, 'shape': 'box', 'color': '0.5,0.5,0.5', 'orientation': 0, 'sides': 4, 'style': 'solid'}) - 1;
                
                //Add a connection from the current node to the parent node
                if (parent.length > 0){
                    connections.push({'parent': parent[parent.length -1]['id'], 'child': nodeindex, 'label': parent[parent.length -1]['label'], 'color': '0.5,0.5,0.5'});
                }                
                
                //Add the index to the end of the parents list, this allows us to correctly link entrys to there previous entry
                parent.push({'id': nodeindex, 'label': '', indent: indent});
                
            //Otherwise this is an operation
            } else {
                //First lets find the closing } as this is required regardless of the operation type
                let level = 0;//This is incremented every time a { is encountered and decremented every time a } is encountered when a } is encountered and level = 0 this is the end location
                let quote = '';//If we are currently withing a quote, track the character that started the quote and look for another matching character to end the quote, while in a quote no } or { will be matched
                
                let searchstartpos = start + result[0].length;
                let subsecend = -1;
                
                //This code needs to be rewritten, it works but it should not overshoot when looking for the ending } and then track backwards
                for (let i=searchstartpos; i< subtext.length; i++){
                    //If the character is a quote character, we need to check if we are already in a quote
                    if (subtext[i] == '"' || subtext[i] == "'" || subtext[i] == '`'){
                        //If we are not currenlty in a quote, then we need to begin a quote
                        if (quote == ''){
                            quote = subtext[i];
                            
                        } else if (quote == subtext[i]){ //Otherwise if we are and the quote character matches the current quote start character, end the quote
                            quote = '';
                        }
                    
                    //If we have found the start of a { and we are not in a block
                    } else if (subtext[i] == '{' && quote == ''){
                        level += 1;
                        
                    //If we have found the end of a block and are not in a quote
                    } else if (subtext[i] == '}' && quote == ''){
                        if (level > 0){
                            level -= 1;
                        } else {
                            subsecend = i;
                            pos = pos + start + i;
                            
                            while (text[pos] != '}'){
                                pos -= 1;
                            }                   
                            
                            pos += 1;
                            
                            break;
                        }                               
                    }                          
                }
                
                //If we could not find the closing }
                if (subsecend == -1){
                    console.warn('Syntax error, missing }');
                    break;
                }
                
                //Now Lets work out what kind of operation we are processing and then add the appropriate entrys to nodes/connections before calling again
                let nodeindex = -1;
                switch (result[1]){
                    case ('if'):
                        console.log('If:', result[2]);
                        
                        //Add the string to nodes and return the index
                        nodeindex = nodes.push({'text': result[2], 'shape': 'ellipse', 'color': '0.5,0.5,0.5', 'orientation': 0, 'sides': 4, 'style': 'solid'}) - 1;
                        
                        //Add a connection from the current node to the parent node
                        if (parent.length > 0){                            
                            connections.push({'parent': parent[parent.length -1]['id'], 'child': nodeindex, 'label': parent[parent.length -1]['label'], 'color': '0.5,0.5,0.5'});
                        }

                        //Add the index to the end of the parents list, this allows us to correctly link entrys to there previous entry
                        parent.push({'id': nodeindex, 'label': 'True', indent: indent});
                        
                        break;
                    
                    case ('else if'):
                    case ('elif'):
                        console.log('elif:', result[2]);                                             
                            
                        //Update the last entry of the parent to have the label false
                        parent[parent.length -1]['label'] = 'False';
                        
                        //Add the string to nodes and return the index
                        nodeindex = nodes.push({'text': result[2], 'shape': 'ellipse', 'color': '0.5,0.5,0.5', 'orientation': 0, 'sides': 4, 'style': 'solid'}) - 1;
                        
                        //Add a connection from the current node to the parent node
                        if (parent.length > 0){                            
                            connections.push({'parent': parent[parent.length -1]['id'], 'child': nodeindex, 'label': parent[parent.length -1]['label'], 'color': '0.5,0.5,0.5'});
                        }

                        //Add the index to the end of the parents list, this allows us to correctly link entrys to there previous entry
                        parent.push({'id': nodeindex, 'label': 'True', indent: indent});
                        
                        break; 
                    
                    case ('switch'):
                        console.log('switch', result[2]);
                        
                        //Add the string to nodes and return the index
                        nodeindex = nodes.push({'text': result[2], 'shape': 'ellipse', 'color': '0.5,0.5,0.5', 'orientation': 0, 'sides': 4, 'style': 'solid'}) - 1;
                        
                        //Add a connection from the current node to the parent node
                        if (parent.length > 0){                            
                            connections.push({'parent': parent[parent.length -1]['id'], 'child': nodeindex, 'label': parent[parent.length -1]['label'], 'color': '0.5,0.5,0.5'});
                        } 
                        
                        //Add the index to the end of the parents list, this allows us to correctly link entrys to there previous entry
                        parent.push({'id': nodeindex, 'label': '', indent: indent});
                        
                        break;
                        
                    case ('case'):
                        console.log('case', result[2]);                        
                                                                        
                        
                        parent[parent.length-1]['label'] =result[2];
                        
                        break;
                        
                    default:
                        //If this is an else statment, it needs to be handled seperatly as it will not have an argument
                        if (result[3] == 'else'){
                            console.log('else:', '');                            
                            
                            //Update the last entry of the parent to have the label false
                            parent[parent.length -1]['label'] = 'False';
                        }                        
                        break;
                }
                
                //Call ourself and pass all values as a reference                
                if (subsecend < subtext.length){
                    ParseCode(subtext.slice(searchstartpos, subsecend), parent, nodes, connections, iter, indent);
                }
                                
                //As we have found the end of a block, remove all entrys until the parent entry is 1 level above the current level
                while (parent[parent.length - 1]['indent'] > indent){
                    parent.splice(parent.length - 1, 1);
                } 
                                
            }
            
        } else {            
            break;
        }
    }
    
    //Decrement the indentation level by 1 before returning
    indent -= 1;
    
    //Return the list of nodes and connections
    return [nodes, connections];
}

//Called with an array of nodes and connections as generated by the code parser and builds dot code that can then be converted to a svg via graphviz
function BuildDotCode(nodes, connections){
    let dotcode = 'digraph A {\n';
    
    for (let i=0; i<nodes.length; i++){
        dotcode += `"${nodes[i]['text']}" [shape=${nodes[i]['shape']}, style=${nodes[i]['style']}, color="${nodes[i]['color']}"];\n`
    }
    
    for (let i=0; i<connections.length; i++){
        dotcode += `"${nodes[connections[i]['parent']]['text']}" -> "${nodes[connections[i]['child']]['text']}" [label="${connections[i]['label']}"];\n`
    }
    
    dotcode += '}';//Close off the diagraph
    
    console.log(dotcode);
    
    //And finally return the dotcode
    return dotcode;
}

//Called when the contents of the input text area is changed, automtically calls function to rebuild the flowchart
function TextChanged(text, img){  
    let ret = ParseCode(text);
    
    let dotcode = BuildDotCode(ret[0], ret[1]);
    
    //And finally lets create a chart using graphviz from the dotcode we just created
    CreateSVG(dotcode, img);
    
    //document.getElementById(img).innerHTML = dotcode;
}

//Saves the current svg as a pdf
function DownloadPdf(orientation='p'){
    const svgElement = document.getElementById('flowchartcont').children[0];
    
    //We now need to work out the scale so that the image fits on the page we will calculate an x and y scale and then use which ever is smaller
    let xscale = -1;
    let yscale = -1;
    
    //If we are portrate then the page dimensions are 793.706 x 1,122.52
    if (orientation == 'p'){
        xscale = 793.706 / svgElement.clientWidth;
        yscale = 1122.52 / svgElement.clientHeight; 
        
    } else {//Otherwise landscape is 1,122.52 x 793.706
        xscale = 1122.52 / svgElement.clientWidth;
        yscale = 793.706 / svgElement.clientHeight; 
    }
    
    //Take the smallest of x, y and 1(we dont want to enlarge to fit page, this could be added as an option?)
    const scale = Math.min(xscale, yscale, 1);
    
    // create a new jsPDF instance
    const pdf = new jsPDF(orientation, 'pt', 'a4');    
    
    // render the svg element
    svg2pdf(svgElement, pdf, {
        xOffset: 0,
        yOffset: 0,
        scale: scale
    });

    // or simply save the created pdf
    pdf.save('Flowchart.pdf');
}

//Called when the page is loaded, displays and example flowchart
function LoadExample(){
    const examplecode = `Start;
if (Is it a weekday){
	switch(What Day Is It){
		case (Monday){
			Monday;
			'Go to work'
		}
		
		case (Tuesday){
			'Tuesday'
			'Go to work'
		}
		
		case (Wednesday){
			"Wednesday"
			'Go to work'
		}
		
		case (Thursday){
			'Thursday'
			'Go to work'
		}
		
		case (Friday){
			Friday;
			if (Is it an rdo?){
				Play Video Games;
			} else {
				Go to work;
			}
		}
	}
	
} else {
	if (Is it sunday){
		Sunday;
		'Play Video Games'
	} else {
		Saturday;
		"Play Video Games"
	}
}`;
    
    //Get a handle the the input code div
    const sourcecont = document.getElementById('flowcharttext');
    
    sourcecont.innerText = examplecode;
    
    //Call the on key up function to build the example flowchart
    sourcecont.onkeyup();
}

/* Reference dot code
    digraph A {
        "Place phone call." [shape=ellipse, style=solid];
        "Home?" [shape=diamond];
        "Place phone call." -> "Home?" [label="Yes"];

        subgraph cluster_test{
            label="SubGraph 1";
            graph[style=dotted];

        "Leave message" [shape=box, color="0.002 0.999 0.999", style = filled];

        "Test" [shape=polygon, sides=7, orientation=50];
        }
    }
*/