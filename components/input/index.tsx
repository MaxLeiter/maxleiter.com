import styles from './input.module.css'

const Input = (props: any) => {
  return <input type="text" className={styles.input} {...props} />
}

export default Input
