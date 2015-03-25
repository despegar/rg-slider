'use strict';
angular.module('rangeSlider')
  .directive('rgSlider', [function () {
    return {
      templateUrl: '../../views/rg-slider.html',
      restrict: 'EA',
      scope: {
        trackerClass:   '@',
        trackBarClass:  '@',
        navigatorClass: '@',
        showNavigator:  '@',
        showCurrentValue:   '@',
        showTrackBarTrail:   '@',
        step:           '=',
        navigatorFrom:  '=',
        navigatorTo:    '=',
        boundVar:       '=',
        invalidFrom:       '=',
        invalidTo:       '=',
        markers:        '=',
        colorBars:       '='
      },
      replace: false,
      link: function postLink(scope, element) {
        var tracker,
          trackerNumber,
          trackbarTrail,
          rgSliderWrapper,
          rgSliderWrapperWidth,
          wrapper = element[0],
          curX,
          totalSteps,
          selectedStep,
          positionWatcher,
          trackerWidth,
          trackerWidthPercent,
          STEP_DIFFERENCE = 1,
          wrapperOfssetLeft = wrapper.firstChild.getBoundingClientRect().left,
          isValidValue,
          invalidRangeMiddle,
          getClosestValidValue;

        /**
         * @description finds element by given classname inside the dom list of given element
         * NOTE its will return only one element
         * @param element <HTMLElement>
         * @param className <String>
         * @returns {*} <HTMLElement>
         */
        function getElementByClassName(element, className) {
          var foundedElement;

          function findElement(element, className) {
            var i,
              length = element.childNodes.length;
            if (foundedElement) {
              return;
            }
            for (i = 0; i < length; i++) {
              if (element.childNodes[i].nodeType && element.childNodes[i].nodeType === 1) {
                if (element.childNodes[i].classList.contains(className)) {
                  foundedElement = element.childNodes[i];
                  break;
                }
                else {
                  findElement(element.childNodes[i], className);
                }
              }
            }
          }

          findElement(element, className);

          return foundedElement;

        }
       
        tracker = getElementByClassName(element[0], 'rg-tracker');
        if (scope.showCurrentValue){
         trackerNumber = getElementByClassName(element[0], 'rg-tracker-number');
        }
        rgSliderWrapper = getElementByClassName(element[0], 'rg-slider-wrapper');
        trackerWidth = tracker.clientWidth;
        if(scope.showTrackBarTrail){
          trackbarTrail = getElementByClassName(element[0], 'rg-trackbar-trail');
        }
        rgSliderWrapperWidth = rgSliderWrapper.clientWidth /*- (trackerWidth / 2)*/;
        trackerWidthPercent = trackerWidth * 100 / rgSliderWrapperWidth;

        function initializeMarkers(){
          var marker,
                markerTextElement,
                markerTextElementWidthPercent,
                slicePercent,
                pixelsSlice;
          if (scope.markers && totalSteps){
            for(var m=0;m<scope.markers.length;m++){
              marker = scope.markers[m];
              marker.left = ((marker.atValue * 100 / totalSteps)/*+ trackerWidthPercent/2*/) + '%';
              /*markerTextElement = getElementByClassName(element[0], 'marker-text-'+m);
              markerTextElementWidthPercent = markerTextElement.clientWidth * 100 / rgSliderWrapperWidth;
              if (100 - marker.left < markerTextElementWidthPercent/2){
                slicePercent = markerTextElementWidthPercent/2 - (100 - marker.left);
                pixelsSlice = slicePercent * 100 / rgSliderWrapperWidth;
                marker.left = (-50) - (pixelsSlice * 100 / markerTextElement.clientWidth) + '%';
              }*/
              if ((parseFloat(marker.left) > 85) && (parseFloat(marker.left) <= 90)){
                marker.textLeft = '-75%';
              }else if (parseFloat(marker.left) > 90){
                marker.textLeft = '-100%';
              }
            }
          }
        }

        function initializeColorBars(){
          var colorBar, percent;
          if (scope.colorBars && totalSteps){
              for(var c=0;c<scope.colorBars.length;c++){
                colorBar = scope.colorBars[c];
                percent = (colorBar.endAt * 100 / totalSteps);
                colorBar.width = percent + '%';
              }
          }
        }

        function startUpdatingTracker() {
          positionWatcher = true;
        }

        function windowResizeHandler(){
          wrapperOfssetLeft = wrapper.firstChild.getBoundingClientRect().left;
          rgSliderWrapperWidth = rgSliderWrapper.clientWidth - (trackerWidth / 2);
        }

        function mouseDownHandler() {
          startUpdatingTracker();
        }

        function mouseUpHandler() {
          if (positionWatcher) {
            positionWatcher = false;
          }
        }

        /**
         * @description Handle mousemove event, set the current X, and if slide tracker if it needed
         * @param event
         */
        function mouseMoveHandler(event) {
            curX = event.pageX - wrapperOfssetLeft;
            //console.log(curX);
          if (positionWatcher) {
            slideTracker();
          }
        }

        /**
         * @description Calculate the position of tracker, where he must go and return
         * @returns {number}
         * @param {number} currentStep is the boundVar value, if it defined we calculating with exact step
         */
        function getExpectedPosition(currentStep) {
          var goTo = ((100 * (curX - trackerWidth/2)) / (rgSliderWrapperWidth + (trackerWidth / 2))),
            availableWidth = 100 - ((100 * trackerWidth) / rgSliderWrapperWidth);
          // to not get negative value
          if (curX > rgSliderWrapperWidth+(trackerWidth/2)){
                goTo = 100;
          }else if (goTo < 0) {
            goTo = 0;
          }else if (goTo > 99) {
            goTo = 100;
          }
          scope.curValue = Math.round(goTo);
          // if setted step go calculate exact step
          if (totalSteps) {
            goTo = calculateByStep(goTo,currentStep);
          }
          // to not get disabled value
          if ( isValidValue(scope.curValue) ) {
              return (goTo <= availableWidth) ? goTo : availableWidth;
          }else{
            if ( !isUndefined(scope.invalidFrom) || !isUndefined(scope.invalidTo) ){
              scope.curValue = Math.round(getClosestValidValue(scope.curValue));
              goTo = Math.trunc((scope.curValue * 100 / totalSteps) * 100)/100;
              return (goTo <= availableWidth) ? goTo : availableWidth;
            }else{
              return undefined;
            }
          }
        }

        /**
         * @description Calculate position of tracker depended on step / if step enabled
         * @param {number} value
         * @param {number} currentStep
         * @returns {number}
         */
        function calculateByStep(value, currentStep) {
          var eachStep = 100 / totalSteps,
            rounded = (value >= 0) ? Math.round(value / eachStep) : currentStep,
            goTo = Math.trunc(rounded * eachStep * 100)/100;
          // set current step in curValue
          scope.curValue = scope.navList[rounded];
          // if the value is last value then set it
          if (Math.floor(goTo) === 100) {
            scope.curValue = scope.navList[rounded - 1] + 1;
          }

          return goTo;
        }

        /**
         * @description Fire watchers and update boundVar value
         */
        function updateBoundVar() {
          scope.$evalAsync(function (scope) {
            if(scope.curValue){
              scope.boundVar = scope.curValue;
            }
          });
        }

        /**
         * @description Render tracker and update boundVar
         */
        function slideTracker(currentStep) {
          var newLeftValue = getExpectedPosition(currentStep);
          if (typeof newLeftValue != 'undefined'){
            tracker.style.left = newLeftValue+ '%';
            if (scope.showCurrentValue) trackerNumber.style.left = newLeftValue+ '%';
            if (scope.showTrackBarTrail) trackbarTrail.style.width = (newLeftValue + trackerWidthPercent/2) + '%';
            updateBoundVar();
          }
        }

        /**
         * @description initialize event listeners
         */
        function initEventListeners() {
          tracker.addEventListener('mousedown', mouseDownHandler);
          wrapper.addEventListener('click', slideTracker);
          document.addEventListener('mouseup', mouseUpHandler);
          document.addEventListener('mousemove', mouseMoveHandler);
          window.addEventListener('resize', windowResizeHandler);
        }

        function removeEventListeners() {
          document.removeEventListener('mouseup', mouseUpHandler);
          document.removeEventListener('mousemove', mouseMoveHandler);
        }

        /**
         * @description Generate navigation list if scope.showNavigator is true and step is provided
         */
        function generateNavigatorListByStep() {
          var navList = [], i;
          for (i = 1; i <= totalSteps; i++) {
            navList.push(i);
          }
          scope.navList = navList;
        }

        /**
         * @description Generate navigation list if scope.showNavigator is true and (navigatorFrom && navigatorTo)  is provided
         */
        function generateNavigatorList() {
          scope.navigatorFrom = parseInt(scope.navigatorFrom, 10);
          scope.navigatorTo = parseInt(scope.navigatorTo, 10);
          var navList = [], i, length = totalSteps + scope.navigatorFrom - STEP_DIFFERENCE;
          // Generate error when navigatorFrom > navigatorTo
          if (scope.navigatorFrom > scope.navigatorTo) {
            throw new Error('navigatorFrom: ' + scope.navigatorFrom + ' must be lower than navigatorTo: ' + scope.navigatorTo);
          }

          for (i = scope.navigatorFrom; i <= length; i++) {
            navList.push(i);
          }
          scope.navList = navList;

        }

        /**
         * @description Set tracker position / if we have default value in boundVar slide to it, if not set first element from nav list
         */
        function setTracker() {
          // Update value in curValue and skip rest because we don't have navigation list
          if (!angular.isArray(scope.navList)) {
            setCurrentValue();
            return;
          }

          var index = scope.navList.indexOf(scope.boundVar);

          if (index !== -1) {
            slideTracker(index);
          }
          else {
            setCurrentValue();
          }
        }

        /**
         * @description Set current value to bound var and call $digest
         */
        function setCurrentValue() {
          scope.curValue = (totalSteps) ? scope.navList[0] : 0;
          updateBoundVar();
        }

        function isUndefined(value){
          return typeof value == 'undefined';
        }

        /**
         * @description Main initialization function which will be called when directive is initialized
         * - Register watchers and event Listeneres
         * - Check provided scope variables
         * - Generate needed variables
         */
        function init() {
          scope.$on('$destroy', removeEventListeners);
          initEventListeners();
          selectedStep = 0;
          // navigatorFrom and step property cant be used together because when setted navigatorFrom step will be calculated automatically
          if (scope.navigatorFrom && scope.step) {
            throw new Error('navigatorFrom and step can not be used together');
          }
          // Check if we have seted steps range in scope
          if (scope.navigatorFrom !== undefined && scope.navigatorTo && scope.showNavigator) {
            totalSteps = scope.navigatorTo - scope.navigatorFrom;
            generateNavigatorList();

          }
          // check if we have only setted step
          if (scope.step) {
            totalSteps = parseInt(scope.step, 10) - STEP_DIFFERENCE;
            generateNavigatorListByStep();

          }
          // if we total steps then set ul>li's exact width
          if (totalSteps) {
            scope.listItemWidth = Math.round((rgSliderWrapperWidth * (100 / totalSteps)) / 100) + 'px';
            // Set first value as current value
          }

          // Dinamically declare isValidValue (of valid range) for more performance 
          if ( isUndefined(scope.invalidFrom) && isUndefined(scope.invalidTo) ){
            isValidValue = function (){ return true };
          }else if ( isUndefined(scope.invalidFrom) && !isUndefined(scope.invalidTo) ){
            isValidValue = function (value){ return value > scope.invalidTo };
            getClosestValidValue = function (value){ return (value <= scope.invalidTo )? scope.invalidTo+1:value; };
          }else if ( !isUndefined(scope.invalidFrom) && isUndefined(scope.invalidTo) ){
            isValidValue = function (value){ return value < scope.invalidFrom };
            getClosestValidValue = function (value){ return scope.invalidFrom-1 };
          }else{
            isValidValue = function (value){ return (value < scope.invalidFrom) || (value > scope.invalidTo) };
            invalidRangeMiddle = (scope.invalidTo + scope.invalidFrom) / 2;
            getClosestValidValue = function (value){ return (value > invalidRangeMiddle)? scope.invalidTo+1 : (value < invalidRangeMiddle)?scope.invalidFrom-1:value; };
          }

          initializeMarkers();
          initializeColorBars();

          setTracker();

        }

        init();
      }
    };
  }]);
