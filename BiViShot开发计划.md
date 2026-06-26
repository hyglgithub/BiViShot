**BiViShot开发计划**

### 参考项目

https://github.com/Vant1032/BilibiliVideoCaptureImage
 请将该项目拉取到本地，研究是如何实现的，总结经验，再开始下述实现。

### create a new repository on the command line

echo "# BiViShot" >> README.md
 git init
 git add README.md
 git commit -m "first commit"
 git branch -M main
 git remote add origin https://github.com/hyglgithub/BiViShot.git
 git push -u origin main

### 实现目标

截取B站当前视频帧保存为图片，由于直接从原始视频的帧中提取图像，因此几乎无损将视频信息保存下来，画面非常清晰。
 我希望这是一个插件，打开b站具体视频页面会显示一个可移动的悬浮工具条，工具条上包含这些内容。视频截图到文件。视频截图到剪切板。上一帧 (视频暂停时可用)。下一帧 (视频暂停时可用)。