/*!
 * Chat Engine
 * Copyright (c) 2015 Infodesire
 * Website: http://infodesire.com/
 * Version: 0.1 (20-Nov-2015)
 * Requires: jQuery v1.7.1 or later 
 */
$(function(){
    
    window.Chat = {};
    
    /**
     * Chat data
     */
    Chat._data = {
        currentTab: null,
        currentConversation: null,
        lang: "en_EN",
        page: 1,
        pathUrl: "",
        restUrl: "http://127.0.0.1/chat/rest_demo/",
        lastUpdate: null,
        updateInterval: 3000,
    };
    
    /**
     * Chat assets functions
     */
    Chat._assets = {
        
        ajax: function(type, url, callback, data, dataType, upload){
            return $.ajax({
                url: Chat._data.restUrl + url,
                type: type,
                data: data ? data : null,
                success: callback,
                dataType: dataType ? dataType : "json",
                contentType: upload ? false : "application/x-www-form-urlencoded; charset=UTF-8",
                processData: upload ? false : true
            });  
        },
        
        ajaxCheck: function(data){
            if(!data || typeof data == 'undefined') return false;
            if(typeof data != 'object' || $.isEmptyObject(data)) return false;
            if(!data.statusCode || !data.data) return false;
            if(data.data.logout){window.location = Chat._data.pathUrl + "logout";return false;}
            if(!data.statusCode.isSuccess) return false;
            if(data.statusCode.isError) return false;
            
            return true;
        },
        
        textParse: function(text, opts){
            text = text.replace("data-src=", "src=");
            switch(typeof(text)){
                case "string":
                    var match = /\{\{fi-(.*?)\}\}/g;
                    
                    if(Chat._data.currentTab == "groups" && opts['is_group'] == 1){
                        opts['unread_messages'] = 0;
                        opts['textHTML'] = opts['description'];
                    }
                    
                    //if
                    text = text.replace(/\{\{if\((.*?)\)\}\}(.*?)\{\{\}\}/g, function(match, a, b){
                        return (eval(a.replace(new RegExp("&amp;", "g"),"&")) ? b : ""); 
                    });
                    
                    //limit
                    text = text.replace(/\{\{fi-([a-zA-Z0-9._']+)[\S\s]?\|[\S\s]?limitTo\:(\d+)\}\}/g, function(match, a, b){
                        return (opts[a] ? opts[a].replace(/<(?:.|\n)*?>/gm, '').substr(0, b) : "");
                    });
                    
                    //upperCase
                    text = text.replace(/\{\{fi-([a-zA-Z0-9._']+)[\S\s]?\|[\S\s]?toUpperCase\}\}/g, function(match, a, b){
                        return (opts[a] ? opts[a].charAt(0).toUpperCase() + opts[a].substr(1) : "");
                    });
                    
                    //message position
                    text = text.replace(new RegExp('{{fi-messagePosition}}','g'), function(match, a){
                        return opts["user_id"] == Chat._data.currentUser ? 'right' : 'left'; 
                    });
                    
                    //animated
                    text = text.replace(new RegExp('{{fi-animated}}','g'), function(match, a){
                        return opts['animated'] ? " animated " + (opts["user_id"] == Chat._data.currentUser ? 'slideInRight' : 'slideInLeft') : ''; 
                    });
                    
                    //files
                    text = text.replace(new RegExp('{{fi-files}}','g'), function(match, a){
                        if(opts["files"] && $.isArray(opts["files"]) && opts["files"].length > 0){
                            var str =  "";
                            
                            opts["files"].forEach(function(value, index){
                                var name = value.split("/").pop(),
                                    ext = value.split(".").pop().toLowerCase();
                                if($.inArray(ext, ["jpg","jpeg","png","gif","bmp"]) > -1 && false){
                                    str = '<div class="chat-box-conversation-message-image"><img src="'+value+'"></div>' + str;   
                                }else{
                                    if(str.indexOf("chat-box-conversation-files") == -1){
                                        str += "<div class='chat-box-conversation-files'><ul>";   
                                    }
                                    str += '<li><a href="'+value+'" target="_blank"><i class="fa fa-file-o"></i>'+name+'</a></li>';
                                    if(str.indexOf("chat-box-conversation-files") > -1 && index+1 == opts["files"].length){
                                        str+= "</ul></div>";
                                    }
                                }
                            });
                            
                            return str;
                        }else{
                            return "";   
                        }
                    });
                    
                    if(opts["date_separator"]) text = text + '<li class="chat-box-conversation-date">'+opts["date_separator"]+'</li>';
                    
                    return text.replace(match, function(match, a){ return (opts[a] ? opts[a] : ""); });
                break;
                case "function":
                    return text(opts);
                break;
                default:
                    return text;
            }
        },
        
        isEquivalent: function(a, b) {
            var aProps = Object.getOwnPropertyNames(a);
            var bProps = Object.getOwnPropertyNames(b);
            
            if (aProps.length != bProps.length) return false;
            for (var i = 0; i < aProps.length; i++) {
                var propName = aProps[i];
                
                if($.isArray(a[propName]) && $.isArray(b[propName])){
                    if (a[propName].length != b[propName].length) return false;
                    /*
                    for (var k = 0, l=a[propName].length; k < l; k++) {
                        if (a[propName][k] instanceof Array && b[propName][k] instanceof Array) {
                            if (!a[propName][k].equals(b[propName][k])) return false;       
                        }else if(a[propName][k] != b[propName][k]) { 
                            return false;
                        }           
                    }
                    */
                }else{
                    if (a[propName] !== b[propName]) return false;
                }
            }
            return true;
        },
        
        notification: function(num){
            var me = this,
                title = '** New message **';
            
            if(num > 0){
                if(me._titleInterval) return;
                me._titleInterval = setInterval(function(){
                    $('title').text( $('title').text() == title ? me.title : title);
                }, 1000);
            }else{
                clearInterval(me._titleInterval);
                delete me._titleInterval;
                $('title').text(me.title);
            }
        },
        
        title: $('title').text()
    }
    
    /**
     * Chat _construct
     */
    Chat.Construct = {
        init: function(){
            var me = Chat;
            me.el = $(".chat-box");
            me.headerEl = me.el.find(".chat-box-header");
            me.bodyEl = me.el.find(".chat-box-body");
            
            $.get(Chat._data.restUrl + "initialize/get", {auth_key: true}, function(e){eval(e); Chat.Construct.check()});
            watch(Chat._data, Chat.Construct.onDataChange, 3, true);
            
            this.bindOpts();
            Chat.LeftSide.init();
            Chat.RightSide.init();
        },
        
        bindOpts: function(){
            $(window).on({
                'resize': this.resize
            });
            
            this.resize();
        },
        
        resize: function(){
            $('.chat-box-body, .chat-box-body .chat-box-left-size, .chat-box-body .chat-box-right-size').outerHeight($(window).height() - 250);
        },
        
        check: function(){
            var readOnlyValues = ['pathUrl', 'restUrl', 'currentUser', 'lang', 'updateInterval'];
            readOnlyValues.forEach(function (elem) {
                Object.defineProperty(Chat._data, elem, { 
                    configurable: false, 
                    writable: false,
                    value: Chat._data[elem]
                });
            });
        },
        
        onDataChange: function(key, action, newValue, oldValue){
            var me = Chat;
            switch(key){
                case "currentTab":
                    me.LeftSide.changeTab(me._data.currentTab, true);
                break;
                case "currentConversation":
                    me.RightSide.conversation.open(me._data.currentConversation, true);
                break;
            }
        }
    }
    
    /**
     * Chat LeftSide
     */
    Chat.LeftSide = {
        init: function(){
            this.el = Chat.bodyEl.find(".chat-box-left-size");
            this.tabsEl = $(".chat-box-tabs-list ul");
            this.listEl = $(".chat-box-tab-items ul");
            this.filterEl = $("input#chat-box-search-input");
            this.itemTemplate = this.listEl.find(".chat-box-tab-item")[0].outerHTML; $(".chat-box-tab-item").remove();
            this.loaderEl = $('<div class="messages-loader"><img src="'+Chat._data.pathUrl+'images/icons/loader.gif"> Loading...</div>');
            
            Chat._data.currentTab = this.tabsEl.find("li.selected").first().attr("data-value") || "contacts";
            
            this.bindOpts();
        },
        
        bindOpts: function(){
            var me = this;
            
            me.tabsEl.on("click", "li.chat-box-tab", function(e){ e.preventDefault();
                me.changeTab($(this).attr("data-value"));
            });
            
            this.filterEl.on("input", this.filterList);
            this.listEl.on("click", "li[data-type='conversation.open']", Chat.RightSide.conversation.open);
            this.listEl.on("click", "li[data-type='conversation.create']", Chat.RightSide.conversation.create);
            
            
            setInterval(function(){
                me.loadList(true);
            }, 45000);
            
            setInterval(function(){
                me.loadList(true, "conversations");
            }, 10000);
        },
        
        filterList: function(e){
            var me = Chat.LeftSide,
                val = me.filterEl.val();
            
            if(e){
                e.preventDefault();
            }
            var filterFunction = function(a, s){
                return (a.textContent || a.innerText || "").toUpperCase().indexOf(s.toUpperCase())>=0;
            }
            
            $.each(me.listEl.find("li"), function(key, value){
                if(!filterFunction(value, val)){
                    $(value).hide();
                }else{
                    $(value).show();
                }
            });
        },
        
        changeTab: function(e, d){
            var me = this,
                tabEl = null;
            
            if(typeof e != "string" && typeof e != "number") return;
            
            tabEl = typeof e == "number" ? me.tabsEl.find("li").eq(e) : me.tabsEl.find("li[data-value='"+e+"']");
            if(tabEl.size() == 0 || tabEl.attr("data-value") == "undefined") return;
            
            me.tabsEl.find("li").removeClass("selected"); tabEl.addClass("selected");
            
            Chat._data.currentTab = tabEl.attr("data-value") || e;
            
            if(!d) return;
            
            me.listEl.html(""); me.loadList();
        },
        
        loadList: function(forceUpdate, forTab, fromMessages){
            var me = this,
                tab = forTab || Chat._data.currentTab,
                callback = function(data, fromCache){
                    Chat.LeftSide.loaderEl.remove();
                    if(fromCache !== true && !Chat._assets.ajaxCheck(data)) return false;
                    data = data.data ? data.data : data;
                    
                    var me = Chat.LeftSide,
                        hasCache = typeof me._cache[tab] == "object",
                        somethingNew = 0;
                    
                    if(!forTab || forTab == Chat._data.currentTab){
                        
                        if(hasCache && me.listEl.children().size() > 0 && me._cache[tab].length == data.length){
                            $.each(data, function(index, value){
                                if(!Chat._assets.isEquivalent(value, me._cache[tab][index]) || (fromMessages && fromMessages == value.id)){
                                    me.listEl.find("li.chat-box-tab-item").not(".chat-box-newBtn").eq(index)[0].outerHTML = $(Chat._assets.textParse(me.itemTemplate, value))[0].outerHTML;
                                }
                            });
                        }else{
                            me.listEl.html("");
                            $.each(data, function(index, value){
                                me.listEl.append(Chat._assets.textParse(me.itemTemplate, value));
                                somethingNew += value.unread_messages > 0 ? 1 : 0;
                            });
                            
                            if(tab == "groups" && me.listEl.find(".chat-box-tab-item.chat-box-newBtn").size()==0){
                                me.listEl.prepend(Chat._assets.textParse(me.itemTemplate.replace('data-type="conversation.open"', 'data-type="conversation.create"').replace('class="chat-box-tab-item"', 'class="chat-box-tab-item chat-box-newBtn"')+"<hr>", { avatar: ""+Chat._data.pathUrl+"images/icons/group-plus.png", name: "Create a new group" }));   
                            }
                        }
                        
                        me.filterList();
                    }
                    
                    me._cache[tab] = data;
                    
                    if(forTab && somethingNew) Chat._assets.notification(somethingNew);
                    
                    if(tab == "conversations" && Chat._data.currentConversation){
                        $.each(me._cache.conversations, function(index, value){
                            if(value.id == Chat._data.currentConversation){
                                Chat.RightSide._cache[value.id] = value;
                                $(".chat-box-right-title").html(Chat._assets.textParse(Chat.RightSide.headerTitleTemplate, value));
                            }
                        });
                    }
                }
            
            if(!forceUpdate){
                me.listEl.parent().append(me.loaderEl);
            }
            
            if(me._cache[tab] && !forceUpdate){
                callback(me._cache[tab], true);
            }else{
                if(!forTab && me._ajaxRequest) me._ajaxRequest.abort();
                me._ajaxRequest = Chat._assets.ajax("GET", tab + "/list", callback);
            }
        },
        
        _cache: {}
    }
    
    /**
     * Chat RightSide
     */
    Chat.RightSide = {
        init: function(){
            this.el = Chat.bodyEl.find(".chat-box-right-size");
            this.listEl = $(".chat-box-conversation-items ul");
            this.formEl = $(".chat-box-conversation-form");
            this.itemTemplate = this.listEl.find(".chat-box-conversation-item")[0].outerHTML; $(".chat-box-conversation-item").remove();
            this.headerTitleTemplate = $(".chat-box-right-title")[0].innerHTML; $(".chat-box-right-title").html("");
            this.loaderEl = $('<div class="messages-loader"><img src="'+Chat._data.pathUrl+'images/icons/loader.gif"> Loading...</div>');
            
            this.bindOpts();
            this.emoticons.init();
        },
        
        bindOpts: function(){
            var me = this;
            
            $(window).bind("focus blur", me.bindFocus);
            
            me.formEl.find("form").submit(function(e){
                e.preventDefault();
                me.conversation.postMessage();
                return false;
            });
            
            me.formEl.find("#message-post-text").on("input", function(e, wasTriggered){
                if(Chat._data.currentConversation != null && !wasTriggered){
                    me._cache["text_"+Chat._data.currentConversation] = $(this).val();   
                }
            });
            
            me.formEl.find("#message-post-text").on("keydown", function(e){
                var k = e.which;
                if(k == 13 && !e.shiftKey){
                    e.preventDefault();
                    $(this).closest('form').submit();
                }
            });
            
            Chat.headerEl.on("click", "li.chat-box-action[data-type]", function(e){
                e.preventDefault();
                var type = $(this).attr("data-type");
                if(!type || type.length == 0) return;
                
                switch(type){
                    case 'conversation.refresh':
                        $(this).removeClass('animate rotate').hide().addClass('animate rotate').show();
                        Chat.RightSide.conversation.loadMessages(true, true);
                    break;
                    case 'conversation.remove':
                        modal({
                            type: "confirm",
                            title: "Confirm",
                            text: "Are you sure you want to remove this conversation?",
                            callback: function(a){
                                if(a){
                                    var me = Chat.RightSide;
                                    if(me._ajaxRequest) me._ajaxRequest.abort();
                                    Chat._assets.ajax("GET", "conversation/"+Chat._data.currentConversation+"/delete", null);
                                    window.location.reload();
                                }
                            }
                        });
                    break;
                    case 'conversation.close':
                        Chat._data.currentConversation = null;
                        Chat._assets.ajax("GET", "conversation/1/close", null);
                    break;
                }
            });
        },
        
        bindFocus: function(e){
            var me = Chat.RightSide;
            me._cache.focused = e.type == "focus" ? true : false;
        },
        
        bindScroll: function(e){
            var scrollTop = $(this).scrollTop(),
                me = Chat.RightSide;
            
            if(scrollTop == 0 && Chat._data.page != null){
                me.conversation.loadMessages(true, false, true);   
            }
            
            if(scrollTop < me._cache.lastScroll){
                me._cache.scrollWasTriggered = false;
                me._cache.already_scrolled = true;
            }
            
            if(scrollTop > me._cache.lastScroll && me._cache.ready){
                me._cache.last_msg_seen = [];
                $.each(me.listEl.find("li.chat-box-conversation-item[data-value]"), function(index, value){
                    if($(value).position().top >= 0 && $(value).position().top <= me.listEl.parent().height() && typeof($(value).attr("data-value"))!="undefined"){
                        var v = $(value).attr("data-value");
                        
                        me._cache.last_msg_seen.indexOf(v) == -1 ? Chat.RightSide._cache.last_msg_seen.push(v) : null;
                    }
                });
            }
            if(scrollTop+this.offsetHeight == this.scrollHeight && !me._cache.scrollWasTriggered){
                me._cache.lastScroll = scrollTop;
                me._cache.already_scrolled = false;
                
                me.conversation.update(Chat._data.currentConversation, {unread_messages: 0});
            }
        },
        
        conversation: {
            open: function(e, d){
                var me = Chat.RightSide,
                    current = null;
                
                if(e == null){
                    Chat.LeftSide.listEl.find(".selected").removeClass("selected");
                    this.resetHTML(); me.listEl.append('<img src="'+Chat._data.pathUrl+'images/icons/novaya.png">');
                    if(this._interval) clearInterval(this._interval);
                    me.conversation.current = null;
                    return;
                }
                
                if(typeof e == "object" && e.currentTarget && !$(e.currentTarget).hasClass("selected")){
                    current = $(e.currentTarget).attr("data-value");
                    Chat.LeftSide.listEl.find("li").removeClass("selected"); $(e.currentTarget).addClass("selected"); Chat.LeftSide.currentListItemEl = $(e.currentTarget);
                }else if(typeof e == "number"){
                    current = e;
                }else if(typeof e == "string"){
                    current = e;
                }else{
                    return;
                }
                
                if(!current || typeof current == undefined || me.conversation.current == current || Chat._data.pathUrl + "conversation/" + me.conversation.current == current) return;
                
                me.conversation.current = current;
                
                me.conversation.resetHTML(); me.conversation.loadConversation();
            },
            
            resetHTML: function(){
                var me = Chat.RightSide;
                
                Chat.headerEl.removeClass("conversation-selected"); $(".chat-box-right-title").html(""); $("#message-post-text").removeAttr("disabled").val("").trigger('input', true); me.listEl.html(""); me.formEl.find('button:submit').removeAttr("disabled"); me.formEl.find('#message-id').remove();jsmJaQo($('.attach_file'),me.formEl.find('input:file'), true);
            },
            
            loadConversation: function(forceUpdate){
                var me = Chat.RightSide,
                    current = me.conversation.current,
                    callback = function(data, fromCache){
                        Chat.RightSide.loaderEl.remove();
                        if(!fromCache && !Chat._assets.ajaxCheck(data)){
                            Chat._data.currentConversation = null;
                            return false;
                        }
                        
                        data = data.data ? data.data[0] : data;
                        if(!data || data.length == 0){
                            Chat._data.currentConversation = null;
                            return;
                        }
                        
                        var me = Chat.RightSide,
                            hasCache = typeof me._cache[current] == "object";
                        
                        data.unread_messages = 0; me.conversation.update(data.id, data);
                        
                        Chat.headerEl.addClass("conversation-selected"); $(".chat-box-right-title").html(Chat._assets.textParse(me.headerTitleTemplate, data));
                        
                        current = me.conversation.current = Chat._data.currentConversation = data.id;
                        me._cache[current] = data;
                        
                        if(me._cache["text_"+Chat._data.currentConversation]) me.formEl.find("#message-post-text").val(me._cache["text_"+Chat._data.currentConversation]).trigger('input', true);
                        if(me._cache.messages) me._cache.messages = {};
                        if(me._cache.last_msg_seen) me._cache.last_msg_seen = ["_all"];
                        if(me._cache.ready) delete me._cache.ready;
                        if(me._cache.scrollWasTriggered) delete me._cache.scrollWasTriggered;
                        if(me._cache.lastScroll) delete me._cache.lastScroll;
                        if(me._cache.already_scrolled) delete me._cache.already_scrolled;
                        
                        me.conversation._interval = setInterval(function(){
                            Chat.RightSide.conversation.loadMessages(true);
                        }, Chat._data.updateInterval); me.conversation.loadMessages();
                    };
                
                if(this._interval) clearInterval(this._interval);
                me.listEl.append(me.loaderEl);
                
                if(me._cache[current] && !forceUpdate){
                    callback(me._cache[current], true);
                }else{
                    if(me._ajaxRequest) me._ajaxRequest.abort();
                    me._ajaxRequest = Chat._assets.ajax("GET", "conversation/1/get", callback, {url: current});
                }
            },
            
            loadMessages: function(forceUpdate, scrollToEnd, fromScroll){
                var me = Chat.RightSide,
                    current = Chat._data.currentConversation,
                    callback = function(data, fromCache){
                        Chat.RightSide.loaderEl.remove();
                        if(!fromCache && !Chat._assets.ajaxCheck(data)) return false; 
                        data = data.data ? data.data : data;
                        
                        var me = Chat.RightSide,
                            hasCache = typeof me._cache.messages[current] == "object",
                            hasOffset = typeof data.page != "undefined",
                            somethingNew = Chat.LeftSide._cache.conversations && $.grep(Chat.LeftSide._cache.conversations, function(x){return x.id == current})[0] ? $.grep(Chat.LeftSide._cache.conversations, function(x){return x.id == current})[0].unread_messages : 0;
                        
                        if(hasOffset){
                            var h = me.listEl.height();
                            
                            $.each(data, function(index, value){
                                if(index == "page") return;
                                me.listEl.prepend(Chat._assets.textParse(me.itemTemplate, value));
                            });
                            Chat._data.page = data.page;
                            
                            if(data.page == null){
                                me.listEl.prepend(Chat._assets.textParse('', {date_separator: 'Begin of the conversation'}));      
                            }
                            
                            me.listEl.parent().scrollTop(me.listEl.height() - h - 35).bind("scroll", me.bindScroll);
                            
                            return;
                        }
                        
                        if(hasCache){
                            $.each(data, function(index, value){
                                if(me._cache.messages[current][me._cache.messages[current].length-1] && value.id == me._cache.messages[current][me._cache.messages[current].length-1].id){
                                    if(!Chat._assets.isEquivalent(value, me._cache.messages[current][index])){
                                        me.listEl.find("li.chat-box-conversation-item").last()[0].outerHTML = $(Chat._assets.textParse(me.itemTemplate, value))[0].outerHTML;
                                    }
                                }
                                
                                if((me._cache.messages[current][me._cache.messages[current].length-1] ? value.id > me._cache.messages[current][me._cache.messages[current].length-1].id : true)){
                                    if(forceUpdate) value.animated = true;
                                    me.listEl.append(Chat._assets.textParse(me.itemTemplate, value));
                                    if(forceUpdate) delete value.animated;
                                    
                                    if(value.user_id != Chat._data.currentUser) somethingNew++;
                                }
                            });
                        }else{
                            me.listEl.html("");
                            $.each(data, function(index, value){
                                me.listEl.append(Chat._assets.textParse(me.itemTemplate, value));
                            });
                            
                            if(me.listEl.parent()[0].scrollHeight == me.listEl.parent().outerHeight() && me.listEl.find("li.chat-box-conversation-item").size() > 15) me.bindScroll.call(me.listEl.parent());
                        }

                        me._cache.messages[current] = data;
                        
                        me.conversation.update(current, {textHTML: me._cache.messages[current][me._cache.messages[current].length-1] ? me._cache.messages[current][me._cache.messages[current].length-1].textHTML : "", unread_messages: (me._cache.already_scrolled || !me._cache.focused ? somethingNew : 0)});
                        
                        if(!forceUpdate || scrollToEnd || !me._cache.already_scrolled){
                            me._cache.scrollWasTriggered = true;
                            me.listEl.parent().scrollTop(me.listEl.parent()[0].scrollHeight);
                            if(!me._cache.ready) setTimeout(function(){
                                me._cache.ready = true; me._cache.lastScroll = me.listEl.parent().scrollTop(); me.listEl.parent().bind("scroll", me.bindScroll);},100);
                        }
                    };
                
                if(current == null) return;
                
                if(!forceUpdate){
                    me.listEl.parent().append(me.loaderEl);
                }
                
                if(fromScroll){
                    me.listEl.parent().prepend(me.loaderEl).unbind("scroll", me.bindScroll);
                }
                
                if(!forceUpdate && me._cache.messages[current]){
                    callback(me._cache.messages[current], true);
                }else{
                    var params = {last_msg_seen: (me._cache.focused ? me._cache.last_msg_seen : [])},
                        params = fromScroll ? {offset: Chat._data.page} : params;
                    me._ajaxRequest = Chat._assets.ajax("POST", "messages/"+Chat._data.currentConversation+"/list", callback, params);
                }
            },
            
            create: function(){
                var me = Chat.RightSide;
                $.get(Chat._data.restUrl + "groupCreate/js", function(e){eval(e)});
            },
            
            update: function(id, data){
                var me = Chat.RightSide,
                    url = Chat._data.pathUrl+'conversations/' + id,
                    update = false;
                
                if(Chat.LeftSide._cache.conversations){
                    Chat.LeftSide._cache.conversations.filter(function(value, index){
                        if(value.id == id){
                            var ls = $.extend(true, {}, value);
                            if(typeof data.unread_messages != "undefined" && data.unread_messages !== 0 && data.unread_messages < value.unread_messages){
                                data.unread_messages = value.unread_messages;
                            }
                            value = $.extend(true, value, data);
                            if(!Chat._assets.isEquivalent(ls, value)) update = true;
                        }
                    });
                }
                
                if(Chat._data.currentTab == "conversations" && update){
                    Chat.LeftSide.loadList(false, "conversations", id);
                    if(data && typeof data.unread_messages != "undefined"){
                        Chat._assets.notification(data.unread_messages);
                    }
                }
            },
            
            editMessage: function(){
                  
            },
            
            postMessage: function(){
                var me = Chat.RightSide,
                    current = Chat._data.currentConversation,
                    textEl = me.formEl.find("#message-post-text"),
                    message_id = me.formEl.find("#message-id").size() > 0 ? me.formEl.find("#message-id") : null,
                    text = textEl.val(),
                    callback = function(data){
                        textEl.removeAttr("disabled").focus(); me.formEl.find('button:submit').removeAttr("disabled");  me.formEl.find('#message-id').remove();jsmJaQo($('.attach_file'),me.formEl.find('input:file'), true);
                        if(!Chat._assets.ajaxCheck(data)){
                            if(data && data.data && data.data._js){
                                eval(data.data._js);   
                            }
                            return false;
                        };
                        
                        delete me._cache["text_"+current];
                        textEl.val("").trigger('input', true);
                        
                        me.conversation.loadMessages(true, true);
                    }
                
                if(current == null || !text || typeof text != 'string' || text.length == 0 || /^\s+$/.test(text)) return;
                
                var data = new FormData(me.formEl.find("form").get(0));
                data.append("conversation_id", current);
                
                Chat._assets.ajax("POST", "messages/1/post", callback, data, false, true);
                textEl.attr("disabled", "disabled"); me.formEl.find('button:submit').attr("disabled", "disabled");
            }
        },
        
        emoticons: {
            init: function(){
                this.el = $('<div class="emoticons-box"></div>');
                this.buttonEl = $(".attach_smile");
                this.bindOpts();
                this.load();
            },
            
            bindOpts: function(){
                var me = Chat.RightSide.emoticons;
                
                if(me.data) return;
                
                me.buttonEl.on("click", me.createHtml);
                
                $(window).bind("contextmenu blur resize scroll keydown", function() {
                    me.hide();
                }).bind("click", function(e){
                    if(!me.buttonEl.is(e.target) && !me.el.is(e.target) && !$(e.target).closest("div").is(me.el)){
                        me.hide();
                    }
                })
            },
                                 
            hide: function(){
                var me = Chat.RightSide.emoticons;
                
                $(".emoticons-box").html("").hide();
            },
            
            load: function(){
                var me = Chat.RightSide.emoticons;
                
                if(me._ajaxRequest) me._ajaxRequest.abort();
                if(me.data){
                    return;
                }else{
                    me._ajaxRequest = Chat._assets.ajax("GET", "emoticons/list", function(data){
                        me.data = data;
                    });
                }
            },
                
            createHtml: function(){
                var me = Chat.RightSide.emoticons,
                    list = '<ul class="list-inline">';
                
                if(me.el.is(':visible')){me.hide(); return; }
                
                for(var i = 0; i<me.data.data.length; i++){
                    list += '<li><a onclick="Chat.RightSide.emoticons.add(\''+me.data.data[i].name+'\')"><span style="background: url(\''+Chat._data.pathUrl+me.data.data[i].img+'\') center no-repeat; background-size: 18px auto"></a></li>';
                }
                
                list += '</ul>';
                
                $("body").append(me.el.append(list).show());
                
                me.el.css({
                    top: me.buttonEl.offset().top - me.buttonEl.outerHeight()/2 - me.el.outerHeight(),
                    left: me.buttonEl.offset().left + me.buttonEl.outerWidth() - me.el.outerWidth() + 10
                });
            },
            
            add: function(a){
                $("#message-post-text").val($("#message-post-text").val() + "emoji-"+a+";").trigger('input', true)
            }
        },
        
        _cache: {last_msg_seen: ["_all"], focused: true, messages:{}}
    }
    
    Chat.Construct.init();
    
});