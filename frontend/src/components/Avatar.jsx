function Avatar({ text, imageUrl, size = "md" }) {
  const sizeClass = {
    sm: "w-7 h-7 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base"
  }[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="avatar"
        className={`${sizeClass} rounded-full object-cover object-center shrink-0 bg-gray-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold shrink-0`}
    >
      {text}
    </div>
  );
}

export default Avatar;