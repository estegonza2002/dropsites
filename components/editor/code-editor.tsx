'use client'

import { useRef, useEffect, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

export type EditorLanguage = 'html' | 'css' | 'javascript' | 'json' | 'text'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: EditorLanguage
  readOnly?: boolean
  darkMode?: boolean
  className?: string
}

function getLanguageExtension(lang: EditorLanguage): Extension | null {
  switch (lang) {
    case 'html':
      return html()
    case 'css':
      return css()
    case 'javascript':
      return javascript()
    case 'json':
      return javascript() // JSON is a subset of JS for highlighting
    default:
      return null
  }
}

export function CodeEditor({
  value,
  onChange,
  language = 'html',
  readOnly = false,
  darkMode = false,
  className,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref updated without recreating the editor
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const createEditor = useCallback(() => {
    if (!containerRef.current) return

    // Destroy previous instance
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightSpecialChars(),
      history(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap,
      ]),
      EditorView.lineWrapping,
    ]

    const langExt = getLanguageExtension(language)
    if (langExt) extensions.push(langExt)

    if (darkMode) extensions.push(oneDark)

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
      extensions.push(EditorView.editable.of(false))
    } else {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        })
      )
    }

    // Consistent font styling
    extensions.push(
      EditorView.theme({
        '&': {
          fontSize: '13px',
          height: '100%',
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          overflow: 'auto',
        },
        '.cm-gutters': {
          borderRight: '1px solid var(--color-border, currentColor)',
        },
      })
    )

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })
  }, [language, readOnly, darkMode, value])

  useEffect(() => {
    createEditor()
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [createEditor])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: '100%', overflow: 'hidden' }}
    />
  )
}
