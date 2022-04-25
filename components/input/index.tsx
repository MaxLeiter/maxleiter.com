import styles from './input.module.css'

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input type="text" className={styles.input} {...props} />
}

export default Input
