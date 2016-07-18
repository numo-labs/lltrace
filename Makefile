fetch-data:
	node dyn.js > data.csv && python get_subs.py >> data.csv

regen-mermaid:
	node create_mermaid.js > mermaid.txt
	mermaid mermaid.txt -s -t custom.css -e `which phantomjs`
	# Work around a mermaid bug where it low-cases custom CSS causing some of rules to not be
	# applied
	sed -i.bak s/edgelabel/edgeLabel/g mermaid.txt.svg
	open -a Firefox mermaid.txt.svg

viz: fetch-data regen-mermaid

.PHONY: viz regen-mermaid fetch-data
