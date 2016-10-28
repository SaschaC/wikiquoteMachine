/* Summary of script:
1. Look up all available languages with proverbs on Wikiquote, parse the Wikitext from all those pages and extract the quotes into objects containing 'language','pageID','meaning','quote','english' (either the translation or english equivalent) ,and 'transliteration' as keys.
2. From the extracted quotes, on click randomly select and display one quote and its information in the html 'quote', 'transliteration', 'language', and 'english' html elements. Update the 'tweet' and 'gtranslate' buttons with info from the randomly selected quote. */

$(document).ready(function() {
  
	pageIds=[];
	var quotes = [];
  
	/*get page IDs of available languages  from the "Proverbs_by_language" Wikiquote page*/			
	$.getJSON("https://en.wikiquote.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Proverbs_by_language&cmlimit=500&format=json&callback=?", function(json) {
		for (var i =0;i<json.query.categorymembers.length;i++) {
			pageIds.push(json.query.categorymembers[i].pageid);     
		}	  
		
		/* Build query urls with pageID lists; divide queries in three blocks (url1, url2, url3), because queries are limited to 50 pageIDs*/
		var thirdPageIds = (pageIds.length-(pageIds.length%3))/3;
		var url1 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(0,thirdPageIds).join("\|")+"&rvprop=content&callback=?";
		var url2 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(thirdPageIds,2*thirdPageIds).join("\|")+"&rvprop=content&callback=?";
		var url3 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(2*thirdPageIds).join("\|")+"&rvprop=content&callback=?";		
		
		/* Run queries with the three URLs*/
		$.getJSON(url1, function(pages) {
			$.getJSON(url2, function(secondPages) {
				$.getJSON(url3, function(thirdPages) {					
					/* Append objects from the url2 (secondPages) and url3 (thirdPages) queries to the 'pages' object (from the url1 query)*/
					for (var pageID in secondPages.query.pages) { pages.query.pages[pageID] = secondPages.query.pages[pageID]; }
					for (var pageID in thirdPages.query.pages) { pages.query.pages[pageID] = thirdPages.query.pages[pageID]; }					
					/* iterate over pageIDs (i.e.,languages) in the 'pages' object*/				
					for(var pageID in pages.query.pages) {
						var language = pages.query.pages[pageID].title.split(/\s/)[0]; 
						var text = pages.query.pages[pageID].revisions[0]["*"];
						/* Split text into chunks, beginning with *; new quotes in the wikitext are defined by a single asterisk (which is the first level of a list). See https://en.wikipedia.org/wiki/Help:Wiki_markup */ 
						var listChunks = text.split(/\n(?=\*(?!\*))/);	
						/* iterate over chunks*/
						listChunks.forEach(function(chunk){
							if (/^\*(?!\*)/.test(chunk)) {
								/* check validity of chunk and normalize lines*/
								filtered_chunk = filter_chunk(chunk,language,pageID);
								/*function only returns chunk if it is valid*/
								if (filtered_chunk) {
									/* create the quote object from the chunk*/
									var quote = create_quote(filtered_chunk,language,pageID)
									/* push quote object on the quote array*/
									quotes.push(quote);
								}
							}
						});						
					}					
					/*intitialize screen*/
					var index = Math.floor(Math.random() * quotes.length);
					newQuote = quotes[index];
					display_quote(newQuote);
					var tweetHref = update_tweet(newQuote);
					var gtranslateHref = update_gtranslate(newQuote.quote);
					update_buttons(quotes,tweetHref,gtranslateHref);

				});
			});
		});	
	});
});

var update_buttons = function(quotes,tweetHref,gtranslateHref){
		
	$('.tweet').on("click", function(){
			window.open(tweetHref,'name','width=600,height=400');
	});	
		
	$('.gtranslate').on("click", function(){
			window.open(gtranslateHref,'name','width=750,height=600');
	});

	$("button.getMessage").on("click", function(){
		var colors = update_colors();						
		$(".content").css("color",colors[1]);
		$("html").css("background-color",colors[0]);	
		$("button").css("background-color",colors[1]);
	
		$('.content').fadeOut('slow', function(){
			var index = Math.floor(Math.random() * quotes.length);
			newQuote = quotes[index];
			display_quote(newQuote);
			tweetHref = update_tweet(newQuote);
			gtranslateHref = update_gtranslate(newQuote.quote);
			if (newQuote.language=="English"||newQuote.language=="Kannada"){
				document.getElementById("gtranslate").disabled = true;}
			else{
				document.getElementById("gtranslate").disabled = false;
			}
			$('.content').fadeIn('slow');
		});	
	});			
}

var filter_chunk = function(chunk,language,pageID){
	
	/* check validity of chunk: only if the quote is in English or there is an english equivalent/translation (in the second level of the list, defined by two asterisks) */
	if(language=="English"||language=="Kannada"||/\*\*\s+English\s+equivalent:|\*\*(English)*\s+Translation:/.test(chunk)) {
		chunk = chunk.split(/\n/);
		/* first filter: filter out irrelevant lines and remove wikitext markup */	
		var filteredChunkOne = chunk.filter(function(val){return/^\*(?!\*)|^\*\*\s+English\s+equivalent:|^\*\*\s+Meaning:|^\*\*(English)*\s+Translation:|^\*\*\s+Transliteration\s*.*:/.test(val);});
		filteredChunkOne=filteredChunkOne.map(remove_markup);
		/* only if there are no special characters in the quote line (first level of list, defined by single asterisk) of the the chunk or if language is chinese (,which contains special characters for chinese character transcription) */
		if (language=="Chinese"||!(/^\*(?!\*).*[\[<\|{]/).test(chunk[0])) {
			/* filter two: filter out second level list lines with special characters */
			var filteredChunkTwo = filteredChunkOne.filter(function(val){return !(/^\*\*\s+.*[\[<\|{#]/).test(val);});
			/* check validity of second filtered chunk: */
			if(language=="English"||language=="Kannada"||filteredChunkTwo.some(function(line){
			return /^\*\*\s+English\s+equivalent:|^\*\*(English)*\s+Translation:/.test(line);})) {							
				filteredChunkTwo.forEach(function(line,index,array) {array[index] = normalize_line(line,language);});
				return filteredChunkTwo;
			}
		}
	}
	return 0;
}

var normalize_line = function(line,language){
	
	/* remove Ruby notation for chinese characters in quote line*/
	if (language=="Chinese"&&/^\*(?!\*)/.test(line)){
		line = line.replace(/(\s*{{ruby.+?\|)(.+?)(\|.+?}}\s*)/g,'$2');
	}
	/* Remove: *,() at the end of entry, more than one single quotes, spaces at beinning and end of entry */ 
	line= line.replace(/^\*+\s*/g,'').replace(/(\W)(\s*\(.+?\))(\s*)($)/g,'$1$4').replace(/''+/g,'').replace(/^\s+/g,'').replace(/\s+$/g,'');
	/* Remove " at beginning of entry (optinonally preceded by entry name),"at end of entry. Quotes might be preceded by \. Quotes might be written as  \u201d. Only remove, if quotes enclose entire entry (e.g., Don't remove quotes in: English equivalent:"Hello" said the cat.) */
	line = line.replace(/^(English\s+equivalent:\s+|Meaning:\s+|Translation:\s+|Transliteration\s*.*:\s+)*(\\*"|\\u201d)([^"]+)(\\*"$|\\u201d$)/,"$1$3");
	/* if there is for some reason a single " (e.g., a typo), remove it */
	if (line.match(/"/g)&&line.match(/"/g).length == 1) {line = line.replace(/"/,'');}
	/* display html code correctly, e.g., &mdash; */
	line = transcript_html(line);
	return line;
}

var remove_markup = function(line,index,chunk){
	
	/* Remove markup; see https://en.wikipedia.org/wiki/Help:Wiki_markup */
	var freeLink = /(\[\[)(.+?)(\]\])/g;
	var customFreeLink = /(\[\[)(.+?)(\|)(.+?)(\]\])/g;
	var nameSpaceLink = /(\[\[)(.+:)(.+?)(\|*)(\]\])/g;
	var redirectLink = /(#REDIRECT\s+)(\[\[.+?\]\])/g;
	var httpsLink = /\[https*.+?\]\s*/g;
	var citation = /{{cit.+?}}/g;
	var ref = /\<ref.+?\/.+\ref>/g;
	
	if(redirectLink.test(line)){line=line.replace(redirectLink,"$2");}
	if(nameSpaceLink.test(line)){line=line.replace(nameSpaceLink,"$3");}
		if(customFreeLink.test(line)){line=line.replace(customFreeLink,"$4");}
	if(freeLink.test(line)){line=line.replace(freeLink,"$2");}
	if(httpsLink.test(line)){line=line.replace(httpsLink,"");}
	if(citation.test(line)){line=line.replace(citation,"");}
	if(ref.test(line)){line=line.replace(ref,"");}
		
	return line;
}

var create_quote = function(chunk,language, pageID) {	
	/* function creates a quote object, with 'language','pageID','meaning','quote','english' (either the translation or english equivalent) ,and 'transliteration' as properties. */
	var quote = {language:language}; 
	quote.pageID = pageID;
	quote.quote = chunk[0];
	quote.transliteration = '';

	if (language=="English"||language=="Kannada"){quote.english = '';}

	for (var i = 1;i<chunk.length;i++){
		 if (/English\s+equivalent:/.test(chunk[i])&&!quote.hasOwnProperty('english')){
			 quote.english = chunk[i];
		 }
		else if (/Translation:/.test(chunk[i])){
			quote.english = chunk[i];
		 }
		else if (/Meaning:/.test(chunk[i])){
			quote.meaning = chunk[i];
		 }       
		else if (/Transliteration/.test(chunk[i])){
			quote.transliteration = chunk[i].replace(/^Transliteration.*?:\s*/i,''); /* Remove Transliteration ((pinyin)): at beginning of sentence */
		 }       
	}	
	return quote;
}

var transcript_html = function(line){
		var txt = document.createElement("textarea");
		txt.innerHTML = line;
		line = txt.value;
		return line;
}

var display_quote = function(quote){	
	$("#quote").text(quote.quote);
	$("#language").text("- "+quote.language);
	$("#transliteration").text(quote.transliteration);
	$("#english").text(quote.english);		
}

var update_tweet = function(quote) {
	var tweet = '"'+quote.quote+'"';
	if (quote.language != "English"&&quote.language != "Kannada"){
		tweet += " ("+quote.language+" proverb) "+"- "+quote.english;
	}
	var tweetHref = "https://twitter.com/share"+"?text="+encodeURIComponent(tweet);
	return tweetHref;
}

var update_gtranslate = function(quote) {
	var gtranslateHref = "https://translate.google.com/#auto/en/"+encodeURIComponent(quote);
	return gtranslateHref;
}

var update_colors = function(){
	var hue = Math.floor(Math.random() * 345);
	var saturation = Math.floor(Math.random() * 40)+60;
	var lightness = 80;
	var backgroundColor = "hsl("+hue+","+saturation+"%,"+lightness+"%)"; 
	lightness += 10;
	var boxColor = "hsl("+hue+","+saturation+"%,"+lightness+"%)"; 
	return [backgroundColor,boxColor];
}