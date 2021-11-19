
import { Component } from 'react'
import Error from '@components/error'

class E extends Component {
  static getInitialProps({ res, err }) {
    const status = res ? res.statusCode : err ? err.statusCode : null
    return { status }
  }

  render() {
    const { status } = this.props
    return <Error status={status} />
  }
}

export default E
