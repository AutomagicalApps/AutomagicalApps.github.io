/**
 * Inspired by PDFAnnotate v1.0.0
 * Big thanks to Author!
 * Author: Ravisha Heshan
 */

//UUID for object id generation
/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
  var self = {};
  var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
  self.generate = function() {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
      lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
      lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
      lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
  }
  return self;
})();

var PDFAnnotate = function(container_id, url, selectBool, options = {}) {
	this.number_of_pages = 0;
	this.pages_rendered = 0;
	this.active_tool = 0; 
	this.fabricObjects = [];
	this.fabricObjectsData = [];
	this.color = '#212121';
	this.borderColor = '#000000';
	this.borderSize = 1;
	this.font_size = 16;
	this.active_canvas = 0;
	this.container_id = container_id;
	this.url = url;
	this.selectBool = selectBool;
	this.isCorrectBool = false;
	var inst = this;
	this.questionIndex = 0; //initial set for select dropdown
	
	

	var loadingTask = PDFJS.getDocument(this.url);
	loadingTask.promise.then(function (pdf) {
	    var scale = 1.3;
	    inst.number_of_pages = pdf.pdfInfo.numPages;

	    for (var i = 1; i <= pdf.pdfInfo.numPages; i++) {
	        pdf.getPage(i).then(function (page) {
	            var viewport = page.getViewport(scale);
	            var canvas = document.createElement('canvas');
	            document.getElementById(inst.container_id).appendChild(canvas);
	            canvas.className = 'pdf-canvas';
	            canvas.height = viewport.height;
	            canvas.width = viewport.width;
	            context = canvas.getContext('2d');

	            var renderContext = {
	                canvasContext: context,
	                viewport: viewport
	            };
	            var renderTask = page.render(renderContext);
	            renderTask.then(function () {
	                $('.pdf-canvas').each(function (index, el) {
	                    $(el).attr('id', 'page-' + (index + 1) + '-canvas');
	                });
	                inst.pages_rendered++;
	                if (inst.pages_rendered == inst.number_of_pages) inst.initFabric();
	            });
	        });
	    }
	}, function (reason) {
	    console.error(reason);
	});

	this.initFabric = function () {
		var inst = this;
	    $('#' + inst.container_id + ' canvas').each(function (index, el) {
	        var background = el.toDataURL("image/png");
	        var fabricObj = new fabric.Canvas(el.id, {
	            freeDrawingBrush: {
	                width: 1,
	                color: inst.color
	            }
	        });
		
		inst.fabricObjects.push(fabricObj);
		if (typeof options.onPageUpdated == 'function') {
			fabricObj.on('object:added', function() {
				var oldValue = Object.assign({}, inst.fabricObjectsData[index]);
				inst.fabricObjectsData[index] = fabricObj.toJSON()
				options.onPageUpdated(index + 1, oldValue, inst.fabricObjectsData[index]) 
			})
		}
	        fabricObj.setBackgroundImage(background, fabricObj.renderAll.bind(fabricObj));
	        $(fabricObj.upperCanvasEl).click(function (event) {
	            inst.active_canvas = index;
	            inst.fabricClickHandler(event, fabricObj);
			});
			fabricObj.on('after:render', function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
				fabricObj.off('after:render')
			})
		});
	}

	this.fabricClickHandler = function(event, fabricObj) {
		var inst = this;
		if (inst.active_tool == 2) {
			var text = new fabric.IText('Sample text', {
			    left: event.clientX - fabricObj.upperCanvasEl.getBoundingClientRect().left,
			    top: event.clientY - fabricObj.upperCanvasEl.getBoundingClientRect().top,
			    fill: inst.color,
			    fontSize: inst.font_size,
			    selectable: true
			});
			fabricObj.add(text);
			inst.active_tool = 0;
		}
		else{
			console.log('in the else of fabricClickHandler with inst.active_tool: '+inst.active_tool);
			

		}
	}
}


var AreaImage = (function () {
    function AreaImage(questionIndex,canvas,toolName,callback) {
        var inst=this;
        this.canvas = canvas;
        this.className= 'ShapeImage';
        this.isDrawing = false;
    	this.callback = callback;
	this.unBindEvents();
        this.bindEvents();
	this.questionIndex = questionIndex;
	    this.toolName = toolName;
	 
    }
	AreaImage.prototype.bindEvents = function() {
		var inst = this;
		console.log('inst.active_tool in bindEvents: ',inst.active_tool);
		console.log('inst.canvas.active_tool in bindEvents: ',inst.canvas.active_tool);
		inst.canvas.on('mouse:down', function(o) {
			inst.onMouseDown(o);
		});
		inst.canvas.on('mouse:move', function(o) {
			inst.onMouseMove(o);
		});
		inst.canvas.on('mouse:up', function(o) {
			inst.onMouseUp(o);
		});
		inst.canvas.on('object:moving', function(o) {
			inst.disable();
		})
	}
	AreaImage.prototype.unBindEvents = function () {
	    var inst = this;
	    inst.canvas.off('mouse:down');
	    inst.canvas.off('mouse:up');
	    inst.canvas.off('mouse:move');
	    inst.canvas.off('object:moving');
	  }
	
	AreaImage.prototype.onMouseUp = function (o) {
		var inst = this;
		inst.disable();
		
    		if (inst.callback) inst.callback();
	};
	
	AreaImage.prototype.onMouseMove = function (o) {
		var inst = this;


		if(!inst.isEnable()){ return; }

		console.log("mouse move AreaImage");
		var pointer = inst.canvas.getPointer(o.e);
		var activeObj = inst.canvas.getActiveObject();
		console.log('activeObj: ',activeObj);
    console.log('this.toolName: ',this.toolName);
    if(this.toolName == "textQuestionInsert"){
		  activeObj.stroke= 'red';
    }
    else if(this.toolName == "automagicalQuestionInsert"){
      activeObj.stroke= 'purple';
    }
    else if(this.toolName == "embeddedImageInsert"){
      activeObj.stroke= 'blue';
    }
    else{
      activeObj.stroke= 'blue';
    }    
		activeObj.strokeWidth= 1;
		//activeObj.fill = 'rgba(255, 0, 0, 0.3)';
		activeObj.fill = 'transparent';
		if(origX > pointer.x){
		  activeObj.set({ left: Math.abs(pointer.x) }); 
		}
		if(origY > pointer.y){
		  activeObj.set({ top: Math.abs(pointer.y) });
		}

		activeObj.set({ width: Math.abs(origX - pointer.x) });
		activeObj.set({ height: Math.abs(origY - pointer.y) });
		
		activeObj.setCoords();
		inst.canvas.renderAll();
	};

    AreaImage.prototype.onMouseDown = function (o) {
      var inst = this;
      inst.enable();
	    console.log('in AreaImage.prototype.onMouseDown with o: ',o);
	    console.log('o.target: ',o.target);
 	
     	if(o.target==null){
      	var pointer = inst.canvas.getPointer(o.e);
      	origX = pointer.x;
      	origY = pointer.y;

    	var rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: 'left',
          originY: 'top',
          width: pointer.x-origX,
          height: pointer.y-origY,
          angle: 0,
          transparentCorners: false,
          hasBorders: false,
          hasControls: false
      });
	var newUUID = UUID.generate();
	
	rect.toObject = (function(toObject) {
			return function() {
				return fabric.util.object.extend(toObject.call(this), {
					name: this.name,
					tool:this.tool,
					isCorrect: this.isCorrectBool,
					questionIndex: this.questionIndex
				});
			};
	})(rect.toObject);
	
	rect.name = newUUID;
	rect.tool = this.toolName;
	rect.questionIndex = this.questionIndex;
	rect.isCorrect = this.isCorrectBool;	
  	inst.canvas.add(rect).setActiveObject(rect);
      }
    };

    AreaImage.prototype.isEnable = function(){
      return this.isDrawing;
    }

    AreaImage.prototype.enable = function(){
      this.isDrawing = true;
    }

    AreaImage.prototype.disable = function(){
      this.isDrawing = false;
    }

    return AreaImage;
}());




PDFAnnotate.prototype.areaImageSelector = function (toolName) {
	var inst = this;
	inst.active_tool = 1;
	
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
		var questionIndex = inst.questionIndex;
		new AreaImage(questionIndex, fabricObj,toolName, function () {
	            inst.active_tool = 1;
	        });
	    });
	}
}


PDFAnnotate.prototype.deleteSelectedObject = function () {
	var inst = this;
	var activeObject = inst.fabricObjects[inst.active_canvas].getActiveObject();
	if (activeObject)
	{
	    if (confirm('Are you sure ?')) {
		    inst.fabricObjects[inst.active_canvas].remove(activeObject);
		    inst.fabricObjects[inst.active_canvas].discardActiveObject();
    		    inst.fabricObjects[inst.active_canvas].renderAll();
	    }
	}
}

PDFAnnotate.prototype.enableSelectedObjectAsCorrectAnswer = function () {
	var inst = this;
	var activeObject = inst.fabricObjects[inst.active_canvas].getActiveObject();
	if (activeObject)
	{
	    inst.fabricObjects[inst.active_canvas].isCorrectBool = true;
	}
}

PDFAnnotate.prototype.setQuestionIndex = function (questionIndex) {
	console.log('in setQuestionIndex with questionIndex: ',questionIndex);
	this.questionIndex = questionIndex;
}

PDFAnnotate.prototype.clearActivePage = function () {
	var inst = this;
	var fabricObj = inst.fabricObjects[inst.active_canvas];
	var bg = fabricObj.backgroundImage;
	if (confirm('Are you sure?')) {
	    fabricObj.clear();
	    fabricObj.setBackgroundImage(bg, fabricObj.renderAll.bind(fabricObj));
	}
}

PDFAnnotate.prototype.serializePdf = function() {
	var inst = this;
	return JSON.stringify(inst.fabricObjects, null, 4);
}

PDFAnnotate.prototype.getFabricObjects = function() {
	var inst = this;
	var imageItems=[];
	$.each(inst.fabricObjects, function (index, fabricObj) {
	    	if(fabricObj._objects.length>0){
		    $.each(fabricObj._objects, function (index, item) {
			   
				var cropped = new Image();
			    	var canvas = item.canvas;
			    	cropped.src = canvas.toDataURL({
				left: item.left,
				top: item.top,
				width: item.width,
				height: item.height
			    });
			   
			    imageItems.push({type:item.type,tool:item.tool,image:cropped.src,questionIndex:item.questionIndex});
			    
		    });
	    }
	    
	});
	
	return imageItems
}

PDFAnnotate.prototype.getFabricObjectsData = function() {
	var inst = this;
	var areaDataItems=[];
	$.each(inst.fabricObjects, function (index, fabricObj) {
	      
	    	if(fabricObj._objects.length>0){
		  var pageIndex = index+1;
		    $.each(fabricObj._objects, function (index, item) {
			    
			    var itemData = {
				    left: item.left,
				    top: item.top,
				    width: item.width,
				    height: item.height,
				    name: item.name,
				    page: pageIndex,
				    canvasWidth: item.canvas.width,
				    canvasHeight: item.canvas.height
			    }
			    
			    areaDataItems.push(itemData);
			    
		    });
	    }
	    
	});
	
	return areaDataItems
}

PDFAnnotate.prototype.loadFromJSON = function(jsonData) {
	var inst = this;
	$.each(inst.fabricObjects, function (index, fabricObj) {
		if (jsonData.length > index) {
			fabricObj.loadFromJSON(jsonData[index], function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
			})
		}
	})
}
