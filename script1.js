$(document).ready(function() {
  
	pageIds=[];
	var quotes = [];
  
	/* get page IDs of available languages  */			
	$.getJSON("https://en.wikiquote.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Proverbs_by_language&cmlimit=500&format=json&callback=?", function(json) {
		for (var i =0;i<json.query.categorymembers.length;i++) {
			pageIds.push(json.query.categorymembers[i].pageid);     
		}
	  
		/* divide query urls in 3 blocks because simultaneous queries are limited to 50 */
		var thirdPageIds = (pageIds.length-(pageIds.length%3))/3;
		var url1 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(0,thirdPageIds).join("\|")+"&rvprop=content&callback=?";
		var url2 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(thirdPageIds,2*thirdPageIds).join("\|")+"&rvprop=content&callback=?";
		var url3 = "https://en.wikiquote.org/w/api.php?action=query&prop=revisions&format=json&pageids="+pageIds.slice(2*thirdPageIds).join("\|")+"&rvprop=content&callback=?";		
	  
		$.getJSON(url1, function(pages) {
			$.getJSON(url2, function(secondPages) {
				$.getJSON(url3, function(thirdPages) {
					
					/* merge all three objects into the 'pages' object*/
					for (var pageID in secondPages.query.pages) { pages.query.pages[pageID] = secondPages.query.pages[pageID]; }
					for (var pageID in thirdPages.query.pages) { pages.query.pages[pageID] = thirdPages.query.pages[pageID]; }
					
					/* loop over languages */				
					for(var pageID in pages.query.pages) {

						var language = pages.query.pages[pageID].title.split(/\s/)[0]; 
						var text = pages.query.pages[pageID].revisions[0]["*"];
						var listChunks = text.split(/\n(?=\*(?!\*))/);	
						
						listChunks.forEach(function(chunk){
							if (/^\*(?!\*)/.test(chunk)) {
								filtered_chunk = filter_chunk(chunk,language,pageID);
								if (filtered_chunk) {
									var quote = create_quote(filtered_chunk,language,pageID)
									quotes.push(quote);
								}
							}
						});
						
					}
				quotes.forEach(check_quote);			
					console.log(quotes.length);
					var index = Math.floor(Math.random() * quotes.length);
					newQuote = quotes[index];
					newQuote = normalize_quote(newQuote);
					display_quote(newQuote);
					var tweetHref = update_tweet(newQuote);
					var gtranslateHref = update_gtranslate(newQuote.quote);
			
					$("button.getMessage").on("click", function(){
						var colors = update_colors();						
						$(".content").css("color",colors[1]);
						$("html").css("background-color",colors[0]);	
						$("button").css("background-color",colors[1]);
						
						$('.content').fadeOut('slow', function(){
							var index = Math.floor(Math.random() * quotes.length);
							newQuote = quotes[index];
							newQuote = normalize_quote(newQuote);
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
										
					$('.tweet').on("click", function(){
							window.open(tweetHref,'name','width=600,height=400');
					});	
					
					
					
					$('.gtranslate').on("click", function(){
							window.open(gtranslateHref,'name','width=750,height=600');
					});	
					
					

				});
			});
		});	
	});
});

var check_quote = function(quote){
		
	/*
	if (quote.language=="Chinese"){
		console.log(quote.quote,quote.english);
		return;/*
	}return;
	/*
	for (key in quote){
		if (/[\*\[\]{}"\|]/.test(quote[key])){
		console.log(quote[key], quote.pageID);
			
		}
	
	}*/
	
}
	
var filter_chunk = function(chunk,language,pageID){
	
	if(language=="English"||language=="Kannada"||/\*\*\s+English\s+equivalent:|\*\*(English)*\s+Translation:/.test(chunk)) {
			
		chunk = chunk.split(/\n/);

		var filteredChunkOne = chunk.filter(function(val){return/^\*(?!\*)|^\*\*\s+English\s+equivalent:|^\*\*\s+Meaning:|^\*\*(English)*\s+Translation:|^\*\*\s+Transliteration\s*.*:/.test(val);});

		filteredChunkOne=filteredChunkOne.map(remove_markup);
		
		if (language=="Chinese"||!(/^\*(?!\*).*[\[<\|{]/).test(chunk[0])) {
									
			var filteredChunkTwo = filteredChunkOne.filter(function(val){return !(/^\*\*\s+.*[\[<\|{#]/).test(val);});
			
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
	
	/* remove Ruby notation for chinese characters in Quotation line*/
	if (language=="Chinese"&&/^\*(?!\*)/.test(line)){
		line = line.replace(/(\s*{{ruby.+?\|)(.+?)(\|.+?}}\s*)/g,'$2');
	}
	/* Remove: *,() at the end of entry, more than one single quotes, spaces at beinning and end of entry */ 
	line= line.replace(/^\*+\s*/g,'').replace(/(\W)(\s*\(.+?\))(\s*)($)/g,'$1$4').replace(/''+/g,'').replace(/^\s+/g,'').replace(/\s+$/g,'');
	/* Remove " at beginning of entry (optinonally preceded by entry name),"at end of entry. Quotes might be preceded by \. Quotes might be written as  \u201d. Only remove, if quotes enclose entire entry (e.g., Don't remove quotes in: English equivalent:"Hello" said the cat.) */
	line = line.replace(/^(English\s+equivalent:\s+|Meaning:\s+|Translation:\s+|Transliteration\s*.*:\s+)*(\\*"|\\u201d)([^"]+)(\\*"$|\\u201d$)/,"$1$3");
	/* if there is for some reason a single " (e.g., a typo), remove it */
	if (line.match(/"/g)&&line.match(/"/g).length == 1) {line = line.replace(/"/,'');}

	return line;
}

var remove_markup = function(line,index,chunk){
	
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
	
	if(!quote.hasOwnProperty('english')){console.log(quote.quote,quote.language);}	
	return quote;
}

var normalize_quote = function(quote){
		
		/*Chinese quotes, remove ruby format */

	
	/*html code */
	for (var property in quote) {
		var txt = document.createElement("textarea");
		txt.innerHTML = quote[property];
		quote[property] = txt.value;
	};
	
	return quote;
}

var display_quote = function(quote){
	
	$("#quote").text(quote.quote);
	$("#language").text("- "+quote.language);
	$("#transliteration").text(quote.transliteration);
	$("#english").text(quote.english);		
}

var update_tweet = function(quote) {
	
	var tweet = '"'+quote.quote+'" '+"("+quote.language+" proverb) ";
	if (quote.language != "English"&&quote.language != "Kannada"){
		tweet += "- "+quote.english;
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