# Tracked changes and comments

Preserve existing revisions and comments. Read the DOCX ZIP package before choosing an edit method; python-docx paragraph iteration can omit content inside revision wrappers. Do not flatten revisions or rebuild a reviewed document from extracted text.

For comments, prefer the installed python-docx `Document.add_comment` API when available. Anchor to nonempty runs, splitting runs carefully if only part of a sentence should be selected. Supply the requested author and actual comment text. Confirm the saved comment has a matching range start, range end and comment reference in document.xml, and an entry in comments.xml.

For tracked changes, edit OOXML on a copy:

- Inserted runs belong inside `w:ins`; deleted text uses `w:del/w:r/w:delText`, not ordinary `w:t`.
- Use fresh numeric revision IDs, author and UTC date attributes. Preserve surrounding run properties and `xml:space="preserve"` where whitespace matters.
- A replacement is a deletion plus insertion. Merely enabling `w:trackRevisions` does not turn existing edits into tracked changes.
- Comments require unique IDs, matching `w:commentRangeStart`, `w:commentRangeEnd` and `w:commentReference`, comments.xml, the document relationship, and the content type. Preserve existing IDs and relationships.
- Do not accept/reject existing revisions unless requested. Package parts outside the intended edit remain intact.

Use zipfile and lxml for targeted package edits. Write to a new ZIP, validate every modified XML part and reopen the document. Check IDs, anchors, relationships, revision authors and both original/final text states. Render the resulting document, but remember LibreOffice may hide markup or comments: verify these in OOXML and, when available, in Word's review UI. A colored paragraph is not a tracked change and a footnote is not a Word comment.
