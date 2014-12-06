// jQuery.Promises, v1.0.1
// Copyright (c)2014 Michael Heim, Zeilenwechsel.de
// Distributed under MIT license
// http://github.com/hashchange/jquery.promises

;( function ( root, factory ) {
    "use strict";

    if ( typeof exports === 'object' ) {

        module.exports = factory( require( 'jquery' ) );

    } else if ( typeof define === 'function' && define.amd ) {

        define( ['jquery'], factory );

    }
}( this, function ( jQuery ) {
    "use strict";

    ;( function( jQuery ) {
        "use strict";
    
        // Detect support for deferred.isResolved, deferred.isRejected in the available jQuery version
        var dfdHasFeature = (function () {
            var dfd = jQuery.Deferred();
            return {
                isResolved: !! dfd.isResolved,
                isRejected: !! dfd.isRejected
            };
        })();
    
        jQuery.extend( {
    
            Promises: ( function ( $ ) {
    
                var Promises = function () {
    
                    var masterDfd = $.Deferred(),
                        collected = [],
                        counter = 0,
                        block,
                        blockIndex,
                        ignoreBelatedCalls = false;
    
    
                    // Make 'new' optional
                    if ( ! ( this instanceof Promises ) ) {
    
                        var obj = new Promises();
                        return Promises.apply( obj, arguments );
                        // ... re-runs the constructor function, same as
                        // obj.constructor.apply( obj, arguments );
    
                    }
    
    
                    /**
                     * Takes an array of objects and removes any duplicates. The first
                     * occurrence of the object is preserved. The order of elements
                     * remains unchanged.
                     *
                     * @param   {Array} arr
                     * @returns {Array}
                     */
                    var toUniqueObjects = function ( arr ) {
    
                        var unique = [],
                            duplicate,
                            i, j, len, uniqueLen;
    
                        for ( i = 0, len = arr.length; i < len; i++ ) {
    
                            duplicate = false;
                            for ( j = 0, uniqueLen = unique.length; j < uniqueLen; j++ ) duplicate = ( arr[i] === unique[j] ) || duplicate;
                            if ( ! duplicate ) unique.push( arr[i] );
    
                        }
    
                        return unique;
    
                    };
    
                    this.add = function () {
    
                        if ( collected[0] && ! this.isUnresolved() && ! ignoreBelatedCalls ) {
                            throw {
                                name: 'PromisesError',
                                message: "Can't add promise when Promises is no longer unresolved"
                            };
                        }
    
                        for ( var i = 0; i < arguments.length; i++ ) collected.push( arguments[i] );
                        collected = toUniqueObjects( collected );
    
                        if ( collected.length ) {
    
                            counter++;
                            $.when.apply( this, collected )
                                .done( resolveIfCurrent( counter ) )
                                .fail( rejectIfCurrent( counter ) );
    
                        }
    
                        return this;
    
                    };
    
                    this.postpone = function () {
    
                        if ( ! block ) {
    
                            if ( collected[0] && ! this.isUnresolved() && ! ignoreBelatedCalls ) {
                                throw {
                                    name: 'PromisesError',
                                    message: "Can't postpone resolution when Promises is no longer unresolved"
                                };
                            }
    
                            block = $.Deferred();
                            blockIndex = collected.length;
                            this.add( block );
    
                        }
    
                        return this;
    
                    };
    
                    this.stopPostponing = function () {
    
                        if ( block ) {
    
                            collected.splice( blockIndex, 1 );
                            this.add();     // we don't add anything, but the masterDeferred will be updated
                            block = null;
    
                        }
    
                        return this;
    
                    };
    
                    this.ignoreBelated = function ( yesno ) {
    
                        ignoreBelatedCalls = ! yesno;
                        return this;
    
                    };
    
                    this.isUnresolved = function () {
    
                        return ! ( this.isResolved() || this.isRejected() );
    
                    };
    
                    // Keep `isResolved` and `isRejected` available in jQuery >= 1.8
                    if ( ! dfdHasFeature.isResolved ) {
    
                        this.isResolved = function () {
                            return this.state() === "resolved";
                        };
    
                    }
    
                    if ( ! dfdHasFeature.isRejected ) {
    
                        this.isRejected = function () {
                            return this.state() === "rejected";
                        };
    
                    }
    
                    var resolveIfCurrent = function ( counterAtInvokation ) {
    
                        return function() {
                            if ( counter === counterAtInvokation ) masterDfd.resolve.apply( this, arguments );
                        };
    
                    };
    
                    var rejectIfCurrent = function ( counterAtInvokation ) {
    
                        return function() {
                            if ( counter === counterAtInvokation ) masterDfd.reject.apply( this, arguments );
                        };
    
                    };
    
                    this.add.apply( this, arguments );
    
                    return masterDfd.promise( this );
    
                };
    
                return Promises;
    
            } )( jQuery )
    
        } );
    
    }( jQuery ));
    return jQuery.Promises;

} ));

