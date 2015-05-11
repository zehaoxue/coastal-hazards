# wps.des: id=SummaryGenerator, title=Parse metadata into summary for Coastal Change Hazards, abstract=Generates tiny medium and full summaries;
# wps.in: input, string, FGDC xml metadata url, uploaded metadata for building the summaries;
# wps.in: attr, string, attribute, attribute for which to create the summaries;

# find theme

library(itemSummaryService)
library(RCurl)

metadata <- getURL(url=input, .opts=curlOptions(followlocation=TRUE))

attr <- tolower(attr)
themeNames	<-	names(attrMap)
theme	<-	NULL
for (i in 1:length(themeNames)){
	if (any(attr %in% unlist(attrMap[i]))){
		theme	<- names(attrMap[i])
		break
	}
}
if (is.null(theme)){stop(paste(c(attr,'not supported by this service'),collapse=' '))}

# should overload 'summary.service' to take a storm, historical, and vulnerability object?
if (theme=='historical'){
	summary	<-	historical.service(metadata,attr)
} else if (theme=='vulnerability'){
	summary	<-	vulnerability.service(metadata,attr)
} else if (theme=='storm'){
	summary	<-	storm.service(metadata,attr)
}

sink('output.json')
cat(summary)
sink()

output 	<-	'output.json'
# wps.out: output, text, output title, JSON object for item summary;