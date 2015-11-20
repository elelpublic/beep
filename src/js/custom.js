$(function(){
    
    /*
        Enable jQuery.uploader
    */
    $('form[method="post"]').uploader({
        data: {
            authenticity_token: Date.now().toString().split('').sort(function(){return 0.5-Math.random()}).join('')
        },
        success: function(a){
            a = JSON.parse(a);
            if(a && a.exec){
                eval(a.exec);   
            }
        },
        error: function(e){
            notify({
                type: "error",
                title: "Request Error",
                message: "Something is wrong, please try again later.",
                position: {
                    x: "right",
                    y: "top"
                },
                autoHide: true,
                icon: '<i class="fa fa-exclamation-triangle"></i>',
                closeBtn: true, //true | false
            });
        },
    });
    
    /*
        Enable jQuery.tipsy
    */
    $('[data-title]').tipsy();
    
    /*
        Enable textAreaAutoSize
    */
    $('#message-post-text').textareaAutoSize();
    
    /*
        Enable jQuery.filer
    */
    window.jsmJaQo = function(icon, input, noTooltip){
        if(noTooltip) input.val("");
        var a = icon
            i = input,
            l = i.get(0).files.length,
            t = l > 0 ? l + " file" + (l == 1 ? " is" : "s are") + " attached" : "No files attached";
            y = $('<div class="tipsy arrow-bottom arrow-center animated slideInDown">'+t+'</div>');

        a.attr("title", t);
        a[(l > 0 ? "addClass" : "removeClass")]("has-files");
        
        if(!noTooltip){
            y.show().appendTo("body").css({
                top: a.offset().top - a.outerHeight() - y.outerHeight(),
                left: a.offset().left - y.outerWidth()/2 + 5
            });

            setTimeout(function(y){
                y.fadeOut(900, function(){$(this).remove()})
            }, 400, y);
        }
    };
    $('.attach_file').filer({
        limit: 10,
        maxSize: 10,
        name: "files",
        onSelect: function(){
            jsmJaQo(arguments[4], arguments[5]);
        },
        onEmpty: function(){
            jsmJaQo(arguments[1], arguments[2]);
        }
    });
    
    /*
        Captcha reload
    */
    $('body').on('click', '._5FpCl-captcha img', function(e){
        e.preventDefault();
        $(this).attr('src', $(this).attr('src'));
    });
});