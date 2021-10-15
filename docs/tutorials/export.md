# Exporting Your Project

Verbose Guacamole currently supports exporting your project to a few formats that cover most of the different unique styles of ebook.

This tutorial will cover those formats, how to convert to other formats, and how to put your final ebook on an e-reader such as the Amazon Kindle.

## Supported Formats

Verbose Guacamole currently supports the following formats:

- EPUB (.epub)
- Markdown (.md)
- Plain Text (.txt)
- NaNoWriMo Obfuscated Text (.txt)

### EPUB

EPUB is short for _electronic publication_ and is a popular format for ebooks. Later in this guide, we will explore how to convert EPUB files to other formats.

We recommend using [Calibre](https://calibre-ebook.com) to open, read, and manage your EPUB ebooks. (We will use Calibre for conversion later in this guide.)

### Markdown

This option will export the raw Markdown you entered into Verbose Guacamole's editor, separate files with a horizontal rule (`---`), and write the output to a `.md` file.

`.md` files have no technical difference from `.txt` files and can be renamed to them or opened with a normal text editor. Alternatively, you can use [Calibre](https://calibre-ebook.com) to view a styled version.

Do note that not every Markdown feature VerbGuac supports is supported by every Markdown reader, so it may not render how you expect.

### Plain Text

The Plain Text option results in a `.txt` file which is essentially the Markdown option with all Markdown style information stripped.

Files are still separated by `---`.

### NaNoWriMo Obfuscated

In days past, NaNoWriMo required you to copy/paste in the full text of your novel to confirm your word count. Some more paranoid writers, with some cause, were afraid that NaNoWriMo might steal their text, which gave rise to NaNoWriMo Obfuscated text.

This option will result in full text suitable for worry-free word counting by third-party services. Here is the result:

- A `.txt` file
- The Plain Text option, but with all letters replaced with the letter "n" to remove all meaning
- There are no `---` separators to avoid throwing off the word count

Here is a sample NaNoWriMo Obfuscated paragraph:

Nnn nnnnn, nnnn nnnnnn nnnnn nnnnn. Nnn nnnn nnn nn nnnnnn nnnn'n n nnnn, N nnnn'n nnnnnnnn nnnn nn nn nn nnnnn nn n nnnnnnn nnnn nn nnnnnnnnnn nn nn nn nn nnnn; nn nnnnnnnn nnnn nnn n nnnnnn nn NnnNnn nn nnnnnnnnn. N nnnnnn nnnn nnnn nnnn. Nnnnnnnn, nn nnnnn nnn nn nnnnnn nn nn nnn nnnnn nnn nnnn nnnnn nnnnnnn nn Nnnnnn. Nnn.

## Other Formats

While Verbose Guacamole does not have native support for these formats, you can easily convert to them from the EPUB format using [Calibre](https://calibre-ebook.com), an open source Ebook manager:

- Mobi
- PDF
- Microsoft Word (DOCX)
- Rich Text Format (RTF)
- And much more...

### How to Convert

First open the exported EPUB file with [Calibre](https://calibre-ebook.com). To convert it, you can type "C" while your book is selected.

You will be presented with a page of options. Once you have selected the format and options you want, click "Convert". To save that format to a location outside of [Calibre](https://calibre-ebook.com), right click on the book and select "Save to disk => Save single format to disk..."

Select the format you converted to, and click "OK".
