// Theirs
import ReactGA from 'react-ga'
import React from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

// Ours
import ApiContext from '../components/ApiContext'
import { StylesheetLink, CodeMirrorLink, MetaTags } from '../components/Meta'
import Carbon from '../components/Carbon'
import { DEFAULT_CODE, DEFAULT_SETTINGS, GA_TRACKING_ID } from '../lib/constants'
import { getRouteState } from '../lib/routing'

const Page = props => (
  <React.Fragment>
    <Head>
      <title>Carbon Embeds</title>
    </Head>
    <MetaTags />
    <StylesheetLink theme={props.theme} />
    <CodeMirrorLink />
    {props.children}
    <style jsx global>
      {`
        html,
        body {
          margin: 0;
          background: transparent;
          min-height: 0;
        }
      `}
    </style>
  </React.Fragment>
)

class Embed extends React.Component {
  static contextType = ApiContext

  state = {
    ...DEFAULT_SETTINGS,
    code: DEFAULT_CODE,
    mounted: false,
    readOnly: true,
    key: 0
  }

  snippet = {}

  async componentDidMount() {
    const { queryState, parameter } = getRouteState(this.props.router)

    if (parameter) {
      const snippet = await this.context.snippet.get(parameter)
      if (snippet) {
        this.snippet = snippet
      }
    }

    // TODO fix state!
    this.i = setTimeout(() => {
      this.setState(s => ({ key: s.key + 1 }))
    }, 10)

    this.setState(
      {
        ...this.snippet,
        ...queryState,
        copyable: queryState.copy !== false,
        readOnly: queryState.readonly !== false,
        mounted: true
      },
      this.postMessage
    )

    ReactGA.initialize(GA_TRACKING_ID)
    ReactGA.event({
      category: 'Embed',
      action: 'iframe:mount',
      label: document.referrer,
      nonInteraction: true
    })
  }

  componentWillUnmount() {
    clearInterval(this.i)
  }

  ref = React.createRef()

  postMessage = () => {
    setTimeout(
      () =>
        window.top.postMessage(
          JSON.stringify({
            // Used by embed provider
            src: window.location.toString(),
            context: 'iframe.resize',
            height: this.ref.current.offsetHeight
          }),
          '*'
        ),
      0
    )
  }

  updateCode = code => {
    this.setState({ code }, this.postMessage)

    window.top.postMessage(
      {
        id: this.state.id ? `carbon:${this.state.id}` : 'carbon',
        code
      },
      '*'
    )
  }

  render() {
    return (
      <Page theme={this.state.theme}>
        {this.state.mounted && (
          <Carbon
            key={this.state.key}
            ref={this.ref}
            config={this.state}
            readOnly={this.state.readOnly}
            copyable={this.state.copyable}
            onChange={this.updateCode}
          >
            {this.state.code}
          </Carbon>
        )}
        <style jsx global>
          {`
            .eliminateOnRender,
            .twitter-png-fix {
              display: none;
            }
          `}
        </style>
      </Page>
    )
  }
}

export default withRouter(Embed)
