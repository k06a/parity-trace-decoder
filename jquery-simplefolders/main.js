$(document).delegate('.expander','click',function(){
  $(this).toggleClass('expanded')
    .nextAll('ul:first').toggleClass('expanded');
  return true;
});
