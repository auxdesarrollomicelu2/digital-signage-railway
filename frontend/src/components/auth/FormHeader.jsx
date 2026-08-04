import { motion } from 'framer-motion';

export default function FormHeader({ title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-6 sm:mb-8 md:mb-9"
    >
      <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mb-2 md:mb-3">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm sm:text-base text-gray-400">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
